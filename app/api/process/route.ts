import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import pdf2md from '@opendocsg/pdf2md';
import { Pinecone } from '@pinecone-database/pinecone';
import { REDUCED_CHUNK_SIZE, CHUNK_OVERLAP, MAX_FILE_SIZE } from '../../../lib/processing-config';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_ENVIRONMENT) {
  throw new Error('PINECONE_API_KEY and PINECONE_ENVIRONMENT environment variables must be set');
}

const pinecone = new Pinecone({ 
  apiKey: process.env.PINECONE_API_KEY
});

// List all indexes to verify
await pinecone.index('atlas-main').describeIndexStats();

const index = pinecone.index('atlas-main');

const model = "text-embedding-3-small"; //for a benchmark=https://vectorize.io/openai-text-embedding-3-embedding-models-first-look/ 

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;
const requestCounts = new Map<string, { count: number; timestamp: number }>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientRequests = requestCounts.get(clientId);

  if (!clientRequests || (now - clientRequests.timestamp) > RATE_LIMIT_WINDOW) {
    requestCounts.set(clientId, { count: 1, timestamp: now });
    return true;
  }

  if (clientRequests.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  clientRequests.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Basic rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    console.log('API route started');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const rawMetadata = formData.get('metadata');
    const metadata = JSON.parse(rawMetadata as string);
    const documentUrl = formData.get('documentUrl');
    console.log('Document URL from form:', documentUrl); // Debug the URL from formData
    
    if (file && file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }
    
    let text: string;
    
    // Processing Document stage
    if (documentUrl) {
      console.log('Processing URL:', documentUrl.toString());
      text = await preprocessUrl(documentUrl.toString());
    } else {
      text = await preprocessFile(file);
    }

    // const chunks = splitIntoChunks(text);  //OLD
    const chunks = await advancedChunking(text);  //NEW

    // Generating Embeddings stage
    const embeddings = await generateEmbeddings(chunks, model);

    // Storing Data stage
    await storeToPinecone(embeddings, metadata, index, chunks);

    return NextResponse.json({ 
      success: true,
      message: "Document successfully processed and stored",
      documentId: file ? file.name : documentUrl,
      stats: {
        textLength: text.length,
        chunkCount: chunks.length,
        embeddingCount: embeddings.length
      }
    });
    
  } catch (error) {
    console.error('Top level error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the document' },
      { status: 500 }
    );
  }
}

async function preprocessUrl(url: string): Promise<string> {
  try {
    console.log('Raw URL received:', url); // Debug the incoming URL
    
    if (!url) {
      throw new Error('URL is empty or undefined');
    }

    const prefix_url = "https://r.jina.ai/";
    // Remove any potential double slashes when combining URLs
    const fullUrl = `${prefix_url.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    console.log('Constructed full URL:', fullUrl);
    
    const response = await fetch(fullUrl, {
      headers: {
        'Accept': 'text/plain,text/html,application/pdf',
      },
      redirect: 'follow'
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    let content: string;

    if (contentType?.includes('application/pdf')) {
      const arrayBuffer = await response.arrayBuffer();
      content = await pdf2md(new Uint8Array(arrayBuffer));
    } else {
      content = await response.text();
    }

    return content;
  } catch (error) {
    console.error(`Error in preprocessUrl: ${error}`);
    throw error;
  }
}

async function preprocessFile(file: File): Promise<string> {
  try {
    console.log(`Starting preprocessing for file: ${file.name}`);
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(arrayBuffer);
    
    return await cleanAndExtractText(fileContent, file.name);
  } catch (error) {
    console.error(`Error in preprocessFile: ${error}`);
    throw error;
  }
}

async function cleanAndExtractText(fileContent: Buffer, filePath: string): Promise<string> {
  try {
    console.log('Starting text extraction and cleaning');
    
    const fileExtension = path.extname(filePath).toLowerCase();
    let content: string;

    // Add supported file type checking
    const supportedTextTypes = ['.txt', '.md', '.json', '.csv'];
    const supportedTypes = [...supportedTextTypes, '.pdf'];
    
    if (!supportedTypes.includes(fileExtension)) {
      throw new Error(`Unsupported file type: ${fileExtension}. Only ${supportedTypes.join(', ')} files are supported.`);
    }

    if (fileExtension === '.pdf') {
      console.log('Processing PDF document');
      const uint8Array = new Uint8Array(fileContent);
      content = await pdf2md(uint8Array);
    } else if (supportedTextTypes.includes(fileExtension)) {
      console.log(`Processing ${fileExtension} document`);
      content = fileContent.toString('utf8');
    } else {
      throw new Error(`Unhandled file type: ${fileExtension}`);
    }

    console.log('Text extraction completed');
    const cleaned = cleanText(content);
    checkForUrls(cleaned); // Debug: check for URLs after cleaning
    return cleaned;
  } catch (error) {
    console.error(`Error in cleanAndExtractText: ${error}`);
    throw error;
  }
}

function checkForUrls(text: string) {
  const urlRegex = /https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+/gi;
  const matches = text.match(urlRegex);
  if (matches && matches.length > 0) {
    console.error('URLs still present after cleaning:', matches);
    throw new Error('URLs still present after cleaning: ' + matches.join(', '));
  }
}

function cleanText(text: string): string {
  // Remove control characters and normalize whitespace
  text = text.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  text = text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

  // Replace [Author et al. (Year)](url) with Author et al.
  text = text.replace(/\[([^\]]+? et al\. \(\d{4}\))\]\([^)]+\)/g, '$1');

  // Remove any remaining markdown links but keep the link text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove any remaining URLs
  text = text.replace(/https?:\/\/[^\s)]+/g, '');

  // Remove brackets around author citations (if any left)
  text = text.replace(/\[([^\]]+? et al\. \(\d{4}\))\]/g, '$1');

  // Remove code blocks and their content
  text = text.replace(/```[\s\S]*?```/g, "");
  // Remove inline code
  text = text.replace(/`.*?`/g, "");
  // Convert headers to plain text with emphasis
  text = text.replace(/#{1,6}\s*(.*)/g, "$1");
  // Remove image links but keep alt text
  text = text.replace(/!\[(.*?)\]\(.*?\)/g, "$1");
  // Remove Discord mentions specifically
  text = text.replace(/<@[!&]?\d+>/g, "");
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, "");
  // Remove horizontal rules
  text = text.replace(/^\s*[-*_]{3,}\s*$/gm, "");
  // Remove comments
  text = text.replace(/\/\*[\s\S]*?\*\//g, "");
  text = text.replace(/\/\/.*$/gm, "");
  // Normalize whitespace
  text = text.replace(/\s+/g, " ");
  // Remove multiple newlines
  text = text.replace(/\n{3,}/g, "\n\n");
  // Remove special characters except those common in URLs
  text = text.replace(/[^a-zA-Z0-9\s\-_.\/:?=&]/g, "");
  text = text.trim();

  return text;
}

async function advancedChunking(text: string): Promise<string[]> {
    console.log('Chunking with langchain using RecursiveCharacterTextSplitter...');
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 20,
    });

    const chunks: string[] = await splitter.splitText(text);

    return chunks;
}

function splitIntoChunks(text: string): string[] { 
  console.log('Starting text chunking');
  console.log('Input text length:', text.length);
  
  text = cleanText(text);
  console.log('Cleaned text length:', text.length);
  
  let chunks: string[] = [];
  let currentIndex = 0;

  // Add safety check for maximum array size (just under JavaScript's limit)
  const MAX_CHUNKS = 100000; // Reasonable limit for most use cases

  while (currentIndex < text.length) {
    console.log('Regular chunking ....');
    // Safety check for maximum chunks
    if (chunks.length >= MAX_CHUNKS) {
      console.warn(`Reached maximum chunk limit of ${MAX_CHUNKS}. Truncating remaining text.`);
      break;
    }

    // Calculate the end of this chunk
    const endIndex = Math.min(currentIndex + REDUCED_CHUNK_SIZE, text.length);
    
    // Extract the chunk
    const chunk = text.substring(currentIndex, endIndex).trim();
    
    if (chunk.length > 0) {
      try {
        chunks.push(chunk);
      } catch (error) {
        console.error('Error adding chunk:', error);
        console.log('Current chunks length:', chunks.length);
        console.log('Attempted chunk length:', chunk.length);
        throw new Error('Failed to add chunk to array');
      }
    }
    
    // Move to next chunk, accounting for overlap
    currentIndex = endIndex - CHUNK_OVERLAP;
  }
  
  console.log(`Created ${chunks.length} chunks with size ${REDUCED_CHUNK_SIZE} and overlap ${CHUNK_OVERLAP}`);
  return chunks;
}

async function generateEmbeddings(chunks: string[], model: string): Promise<number[][]> {
  try {
    const BATCH_SIZE = 100; // Process chunks in smaller batches
    const allEmbeddings: number[][] = [];
    const retryOptions = { maxRetries: 3, delayMs: 1000 };

    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(chunks.length / BATCH_SIZE)}`);

      let retries = 0;
      
      while (retries < retryOptions.maxRetries) {
        try {
          const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              input: batchChunks,
              model: model
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
          }

          const result = await response.json();
          const batchEmbeddings = result.data.map((item: any) => item.embedding);
          allEmbeddings.push(...batchEmbeddings);
          break;
        } catch (error) {
          retries++;
          if (retries === retryOptions.maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, retryOptions.delayMs));
        }
      }
    }

    return allEmbeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

async function storeToPinecone(embeddings: number[][], metadata: any, index: any, chunks: string[]): Promise<void> {
  try {
    console.log('Starting Pinecone upload');
    console.log(`Total chunks to process: ${chunks.length}`);
    
    // Validate chunks before processing
    if (chunks.length === 0) {
      throw new Error('No chunks to process');
    }

    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Generated document ID: ${documentId}`);
    
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchVectors = chunks.slice(i, i + BATCH_SIZE).map((chunk, batchIndex) => {
        const actualIndex = i + batchIndex;
        
        // Create vector with text field AFTER spreading metadata
        const vector = {
          id: `${documentId}-chunk-${actualIndex}`,
          values: embeddings[actualIndex],
          metadata: {
            ...metadata,  // Spread metadata first
            document_id: documentId,
            chunk_id: `chunk-${actualIndex}`,
            text: chunk  // Add text last to prevent overwriting
          }
        };

        // Debug logging
        if (actualIndex % 50 === 0) {
          console.log(`Vector ${actualIndex} validation:`);
          console.log('- Original chunk:', chunk.substring(0, 100));
          console.log('- Final text in metadata:', vector.metadata.text.substring(0, 100));
          console.log('- Text length:', vector.metadata.text.length);
          console.log('- Metadata keys:', Object.keys(vector.metadata));
        }

        // Validate vector
        if (!vector.metadata.text || vector.metadata.text.trim().length === 0) {
          throw new Error(`Vector text is empty for chunk ${actualIndex}`);
        }

        return vector;
      });

      console.log(`Uploading batch ${i / BATCH_SIZE + 1} of ${Math.ceil(chunks.length / BATCH_SIZE)}`);
      console.log('First vector in batch validation:', {
        id: batchVectors[0].id,
        textLength: batchVectors[0].metadata.text.length,
        textPreview: batchVectors[0].metadata.text.substring(0, 50)
      });

      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          await index.upsert(batchVectors);
          console.log(`Successfully uploaded batch ${i / BATCH_SIZE + 1}`);
          break;
        } catch (error) {
          retries++;
          console.error(`Error uploading batch (attempt ${retries}):`, error);
          if (retries === maxRetries) throw error;
          const delay = 1000 * retries;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.log('Completed Pinecone upload');
  } catch (error) {
    console.error('Error storing to Pinecone:', error);
    throw error;
  }
} 