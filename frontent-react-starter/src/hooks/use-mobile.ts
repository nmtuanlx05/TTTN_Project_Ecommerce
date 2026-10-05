import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

export function useIsMobile() {
  // Đọc ngay trong initializer thay vì gán lại trong effect, tránh một vòng
  // render thừa và tránh chớp sai bề rộng ở lần vẽ đầu.
  const [isMobile, setIsMobile] = React.useState(
    () => window.matchMedia(QUERY).matches,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setIsMobile(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
