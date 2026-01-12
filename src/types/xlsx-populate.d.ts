declare module "xlsx-populate" {
  export interface XlsxPopulateCellRange {
    value(): unknown[][]
  }

  export interface XlsxPopulateSheet {
    name(): string
    usedRange(): XlsxPopulateCellRange | null
  }

  export interface XlsxPopulateWorkbook {
    sheets(): XlsxPopulateSheet[]
  }

  export interface XlsxPopulateStatic {
    fromDataAsync(
      data: Buffer | ArrayBuffer | Uint8Array
    ): Promise<XlsxPopulateWorkbook>
  }

  const XlsxPopulate: XlsxPopulateStatic
  export default XlsxPopulate
}
