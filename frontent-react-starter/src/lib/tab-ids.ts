/** Id DOM của tab và của tabpanel dùng chung, để `TabBar` (`aria-controls`) và nơi dựng tabpanel (`aria-labelledby`) khớp nhau. */
export const tabDomId = (prefix: string, id: string) => `${prefix}-tab-${id}`

/** Một tabpanel dùng chung (nội dung đổi theo tab đang chọn), nên mọi tab cùng trỏ `aria-controls` tới một id. */
export const panelDomId = (prefix: string) => `${prefix}-panel`
