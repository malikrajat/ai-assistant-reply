declare module 'dom-to-image-more' {
  export interface Options {
    width?: number;
    height?: number;
    bgcolor?: string;
    quality?: number;
    cacheBust?: boolean;
    imagePlaceholder?: string;
    filter?: (node: Node) => boolean;
    style?: Record<string, string>;
    [key: string]: unknown;
  }

  export interface DomToImage {
    toPng(node: Node, options?: Options): Promise<string>;
    toJpeg(node: Node, options?: Options): Promise<string>;
    toBlob(node: Node, options?: Options): Promise<Blob>;
    toSvg(node: Node, options?: Options): Promise<string>;
    toPixelData(node: Node, options?: Options): Promise<Uint8ClampedArray>;
  }

  const domtoimage: DomToImage;
  export default domtoimage;
}
