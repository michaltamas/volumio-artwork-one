/// <reference types="vite/client" />
declare module 'socket.io-client' {
  interface Socket { connected: boolean; on(ev: string, fn: (data: any) => void): Socket; off(ev: string, fn?: (data: any) => void): Socket; emit(ev: string, ...args: any[]): Socket; connect(): Socket; disconnect(): Socket; }
  function io(uri?: string, opts?: any): Socket;
  export default io;
}
