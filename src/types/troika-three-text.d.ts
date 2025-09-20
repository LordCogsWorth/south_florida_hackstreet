declare module 'troika-three-text' {
  import { Mesh, Material, Vector3 } from 'three'
  export class Text extends Mesh {
    text: string
    font?: string
    fontSize?: number
    maxWidth?: number
    lineHeight?: number
    letterSpacing?: number
    color?: string | number
    anchorX?: 'left' | 'center' | 'right' | number
    anchorY?: 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom' | number
    outlineWidth?: number
    outlineColor?: string | number
    curveRadius?: number
    material: Material
    sync(): void
    getWorldPosition(target: Vector3): Vector3
  }
}


