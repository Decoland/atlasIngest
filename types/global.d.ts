interface HTMLInputElement {
  webkitdirectory: string;
  directory: string;
}

declare namespace JSX {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string | boolean;
    directory?: string | boolean;
  }
} 