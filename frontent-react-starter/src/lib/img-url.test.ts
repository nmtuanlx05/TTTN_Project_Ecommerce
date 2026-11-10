import { describe, expect, it } from "vitest"
import { IMG_PRESETS, imgAttrs, imgSrcSet, imgUrl, snapImgWidth } from "./img-url"

const BASE = "https://res.cloudinary.com/demo/image/upload"
const CLOUD = `${BASE}/v1762740000/mono-studio/production/products/abc.jpg`
const at = (w: number) => `${BASE}/f_auto,q_auto,c_limit,w_${w}/v1762740000/mono-studio/production/products/abc.jpg`

describe("snapImgWidth", () => {
  it.each([
    [1, 160],
    [160, 160],
    [161, 320],
    [320, 320],
    [321, 640],
    [900, 960],
    [1280, 1280],
    [5000, 1280],
    [0, 160],
    [-10, 160],
    [Number.NaN, 1280],
    [Number.POSITIVE_INFINITY, 1280],
  ])("%s → %s", (input, expected) => {
    expect(snapImgWidth(input)).toBe(expected)
  })
})

describe("imgUrl", () => {
  it("chèn biến đổi ngay sau /image/upload/", () => {
    expect(imgUrl(CLOUD, 640)).toBe(at(640))
  })

  it("làm tròn width lên mức gần nhất", () => {
    expect(imgUrl(CLOUD, 300)).toBe(at(320))
    expect(imgUrl(CLOUD, 5000)).toBe(at(1280))
  })

  it.each([
    ["picsum", "https://picsum.photos/seed/x/600/800"],
    ["ảnh cũ trên đĩa (đường dẫn tương đối)", "/uploads/products/x.webp"],
    ["ảnh cũ trên đĩa (localhost)", "http://localhost:3000/uploads/products/x.webp"],
    ["blob xem trước", "blob:http://localhost:5173/1234"],
    ["chuỗi rỗng", ""],
    ["chuỗi lạ", "không phải url"],
    ["Cloudinary dạng http", "http://res.cloudinary.com/demo/image/upload/v1/x.jpg"],
    ["host giả mạo", "https://res.cloudinary.com.evil.test/demo/image/upload/v1/x.jpg"],
    ["video, không phải ảnh", "https://res.cloudinary.com/demo/video/upload/v1/x.mp4"],
  ])("trả nguyên: %s", (_name, url) => {
    expect(imgUrl(url, 640)).toBe(url)
  })

  it("URL đã có biến đổi thì trả nguyên, không chèn thêm", () => {
    const transformed = `${BASE}/f_auto,q_auto,c_limit,w_320/v1762740000/x.jpg`
    expect(imgUrl(transformed, 960)).toBe(transformed)
    const other = `${BASE}/w_100,h_100,c_fill/v1/x.jpg`
    expect(imgUrl(other, 960)).toBe(other)
  })

  it("giữ nguyên phần sau (thư mục, dấu chấm trong tên)", () => {
    const url = `${BASE}/v1/mono-studio/products/a.b-c.png`
    expect(imgUrl(url, 160)).toBe(`${BASE}/f_auto,q_auto,c_limit,w_160/v1/mono-studio/products/a.b-c.png`)
  })
})

describe("imgSrcSet", () => {
  it("liệt kê các mức, tăng dần, kèm descriptor w", () => {
    expect(imgSrcSet(CLOUD, [640, 320])).toBe(`${at(320)} 320w, ${at(640)} 640w`)
  })

  it("làm tròn và bỏ mức trùng", () => {
    expect(imgSrcSet(CLOUD, [300, 320, 600])).toBe(`${at(320)} 320w, ${at(640)} 640w`)
  })

  it("mặc định dùng đủ năm mức", () => {
    expect(imgSrcSet(CLOUD)?.split(", ")).toHaveLength(5)
  })

  it("undefined khi URL không biến đổi được", () => {
    expect(imgSrcSet("https://picsum.photos/seed/x/600/800", [320, 640])).toBeUndefined()
    expect(imgSrcSet("/uploads/products/x.webp", [320, 640])).toBeUndefined()
  })

  it("undefined khi chỉ còn một mức", () => {
    expect(imgSrcSet(CLOUD, [160])).toBeUndefined()
    expect(imgSrcSet(CLOUD, [100, 150])).toBeUndefined()
  })
})

describe("imgAttrs", () => {
  it("Cloudinary: src, srcSet và sizes theo preset", () => {
    const attrs = imgAttrs(CLOUD, "card")
    expect(attrs.src).toBe(at(320))
    expect(attrs.srcSet).toBe(`${at(320)} 320w, ${at(640)} 640w`)
    expect(attrs.sizes).toBe(IMG_PRESETS.card.sizes)
  })

  it("preset một mức: chỉ có src", () => {
    expect(imgAttrs(CLOUD, "lightbox")).toEqual({ src: at(1280) })
    expect(imgAttrs(CLOUD, "tiny")).toEqual({ src: at(160) })
  })

  it("URL ngoài: trả nguyên, không srcSet và sizes", () => {
    const url = "https://picsum.photos/seed/x/600/800"
    expect(imgAttrs(url, "detail")).toEqual({ src: url })
  })

  it("mọi preset chỉ dùng các mức hợp lệ", () => {
    for (const preset of Object.values(IMG_PRESETS)) {
      for (const width of [preset.src, ...preset.widths]) expect(snapImgWidth(width)).toBe(width)
    }
  })
})
