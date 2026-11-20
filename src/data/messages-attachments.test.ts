import { describe, expect, it } from "vitest";
import { detectAttachment } from "./messages";

describe("detectAttachment", () => {
  it("detects PDF files by signature and extension", () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]); // %PDF-1.5
    const result = detectAttachment(pdfBytes, "factura.pdf");
    expect(result).toEqual({ kind: "document", mimeType: "application/pdf" });
  });

  it("detects XLSX spreadsheet files", () => {
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]); // PK..
    const result = detectAttachment(zipBytes, "presupuesto_soniquete.xlsx");
    expect(result).toEqual({
      kind: "document",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  });

  it("detects DOCX word document files", () => {
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]); // PK..
    const result = detectAttachment(zipBytes, "contrato_artista.docx");
    expect(result).toEqual({
      kind: "document",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  });

  it("detects CSV files", () => {
    const csvBytes = new TextEncoder().encode("nombre,telefono,ciudad\nPepe,612345678,Sevilla");
    const result = detectAttachment(csvBytes, "contactos.csv");
    expect(result).toEqual({
      kind: "document",
      mimeType: "text/csv",
    });
  });

  it("detects ZIP archive files", () => {
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]); // PK..
    const result = detectAttachment(zipBytes, "fotos_flamenco.zip");
    expect(result).toEqual({
      kind: "document",
      mimeType: "application/zip",
    });
  });

  it("detects MP3 audio files", () => {
    const id3Bytes = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00]); // ID3..
    const result = detectAttachment(id3Bytes, "audio_guitarra.mp3");
    expect(result).toEqual({
      kind: "audio",
      mimeType: "audio/mpeg",
    });
  });

  it("detects MP4 video files", () => {
    // ftyp at byte offset 4
    const mp4Bytes = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
    const result = detectAttachment(mp4Bytes, "actuacion_flamenca.mp4");
    expect(result).toEqual({
      kind: "video",
      mimeType: "video/mp4",
    });
  });

  it("detects PNG images", () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = detectAttachment(pngBytes, "cartel.png");
    expect(result).toEqual({
      kind: "image",
      mimeType: "image/png",
    });
  });

  it("refuses unknown file types", () => {
    const exeBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
    const result = detectAttachment(exeBytes, "programa.exe");
    expect(result).toBeNull();
  });
});
