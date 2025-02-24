import * as WebSocket from 'ws'
import { Socket } from 'net'
import { WebSocketTCPClientOptions } from 'timeline-state-resolver-types'

export class WebSocketTcpConnection {
  private ws?: WebSocket
  private tcp?: Socket
  private isConnected = false
  private readonly options: WebSocketTCPClientOptions

  constructor(options: WebSocketTCPClientOptions) {
    this.options = options
  }

  async connect(): Promise<void> {
    try {
      // WebSocket connection
      if (this.options.webSocket?.uri) {
        this.ws = new WebSocket(this.options.webSocket.uri)
        
        await new Promise<void>((resolve, reject) => {
          if (!this.ws) return reject(new Error('WebSocket not initialized'))
          
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket connection timeout'))
          }, this.options.webSocket?.reconnectInterval || 5000)

    	this.ws.on('open', () => {
            clearTimeout(timeout)
            resolve()
          })

          this.ws.on('error', (error) => {
            clearTimeout(timeout)
            reject(error)
          })
        })
      }

      // Optional TCP connection
      if (this.options.tcp?.host && this.options.tcp?.port) {
        this.tcp = new Socket()
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('TCP connection timeout'))
          }, 5000)

          this.tcp?.connect({
            host: this.options.tcp?.host || '',
            port: this.options.tcp?.port || 0
          }, () => {
            clearTimeout(timeout)
            resolve()
          })

          this.tcp?.on('error', (error) => {
            clearTimeout(timeout)
            reject(error)
          })
        })
      }

      this.isConnected = true
    } catch (error) {
      this.isConnected = false
      throw error
    }
  }

  connected(): boolean {
    return this.isConnected
  }

  sendWebSocketMessage(message: string | Buffer): void {
    if (!this.ws) {
      throw new Error('WebSocket not connected')
    }
    this.ws.send(message)
  }

  sendTcpMessage(message: string | buffer): void {
    if (!this.tcp) {
      throw new Error('TCP not connected')
    }
    this.tcp.write(message)
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close()
      this.ws = undefined
    }

    if (this.tcp) {
      this.tcp.destroy()
      this.tcp = undefined
    }

    this.isConnected = false
  }
}