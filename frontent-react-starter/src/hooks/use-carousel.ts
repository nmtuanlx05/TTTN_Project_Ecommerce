import { useState, type KeyboardEvent } from "react"

/**
 * Carousel THỦ CÔNG: chỉ đổi slide khi người dùng ra lệnh (nút, thanh tiến trình, phím mũi tên, vuốt), KHÔNG tự chạy.
 * Quay vòng (slide cuối → đầu). `onKeyDown` gắn lên vùng carousel: ←/→ đổi slide khi focus nằm trong vùng đó.
 */
export function useCarousel(count: number) {
  const [index, setIndex] = useState(0)
  const goTo = (target: number) => setIndex(((target % count) + count) % count)
  const next = () => goTo(index + 1)
  const prev = () => goTo(index - 1)

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key === "ArrowRight") {
      event.preventDefault()
      next()
    } else if (event.key === "ArrowLeft") {
      event.preventDefault()
      prev()
    }
  }

  return { index, goTo, next, prev, onKeyDown }
}
