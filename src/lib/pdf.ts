import { DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

// pdf-parse runs on pdfjs-dist, which expects browser graphics classes
// (DOMMatrix, ImageData, Path2D). On a server, pdfjs tries to load them
// from @napi-rs/canvas with a dynamic require -- Vercel's file tracing
// can't see that require, so the package was left out of the deployed
// function and production crashed with "DOMMatrix is not defined".
//
// Importing @napi-rs/canvas here makes it part of the bundle, and setting
// the globals before pdf-parse loads means pdfjs finds them ready.
const g = globalThis as Record<string, unknown>;
if (!g.DOMMatrix) g.DOMMatrix = DOMMatrix;
if (!g.ImageData) g.ImageData = ImageData;
if (!g.Path2D) g.Path2D = Path2D;

// Returns all the text in a PDF. pdf-parse is imported here (not at the
// top of the file) so it only loads after the globals above are set --
// top-level imports would run first.
export async function extractPdfText(buffer: Buffer): Promise<string> {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
        const data = await parser.getText();
        return data.text;
    } finally {
        await parser.destroy();
    }
}
