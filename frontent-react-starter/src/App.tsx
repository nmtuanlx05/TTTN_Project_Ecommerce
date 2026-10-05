import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AdminLayout } from "@/components/admin/admin-layout"
import DashboardPage from "@/pages/admin/dashboard"
import PlaceholderPage from "@/pages/admin/placeholder"
import StyleguidePage from "@/pages/styleguide"
import "./global.css"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="orders/*" element={<PlaceholderPage />} />
          <Route path="products/*" element={<PlaceholderPage />} />
          <Route path="categories/*" element={<PlaceholderPage />} />
          <Route path="inventory/*" element={<PlaceholderPage />} />
          <Route path="vouchers/*" element={<PlaceholderPage />} />
          <Route path="users/*" element={<PlaceholderPage />} />
        </Route>

        <Route path="/styleguide" element={<StyleguidePage />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
