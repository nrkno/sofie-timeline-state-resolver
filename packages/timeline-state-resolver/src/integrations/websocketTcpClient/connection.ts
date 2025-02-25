import * as WebSocket from 'ws'
import { Socket } from 'net'
import { DeviceStatus, StatusCode, WebSocketTCPClientOptions } from 'timeline-state-resolver-types'

export class WebSocketTcpConnection {
  private ws?: WebSocket
  private tcp?: Socket
  private isWsConnected = false
  private isTcpConnected = false
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
            this.isWsConnected = true
            resolve()
          })

          this.ws.on('error', (error) => {
            clearTimeout(timeout)
            reject(error)
          })
        })

        this.ws.on('close', () => {
          this.isWsConnected = false
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
            this.isTcpConnected = false
            clearTimeout(timeout)
            reject(error)
          })

          this.tcp?.on('close', () => {
            this.isTcpConnected = false
          })
        })
      }

      this.isTcpConnected = true
    } catch (error) {
      this.isTcpConnected = false
      throw error
    }
  }

  connected(): boolean {
    // Check if both WebSocket and TCP connections are active
    // And only use the isTcpConnected flag if the TCP connection is defined
    const isConnected = this.isWsConnected && (this.tcp ? this.isTcpConnected : true)
    return isConnected
  }

  connectionStatus(): Omit<DeviceStatus, "active"> {
    // Check if both WebSocket and TCP connections are active
    // And only use the isTcpConnected flag if the TCP connection is defined
    const isConnected = this.isWsConnected && (this.tcp ? this.isTcpConnected : true)
    let messages: string[] = []
    messages.push(this.isWsConnected ? 'WS Connected' : 'WS Disconnected')
    if (this.tcp) {
      messages.push(this.isTcpConnected ? 'TCP Connected' : 'TCP Disconnected')
    }
    return {
        statusCode: isConnected ? StatusCode.GOOD : StatusCode.BAD,
        messages
    }        
  }

  sendWebSocketMessage(message: string | Buffer): void {
    if (!this.ws) {
      this.isWsConnected = false
      throw new Error('WebSocket not connected')
    }
    this.ws.send(message)
  }

  sendTcpMessage(message: string | Buffer): void {
    if (!this.tcp) {
      this.isTcpConnected = false
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

    this.isWsConnected = false
    this.isTcpConnected = false
  }
}