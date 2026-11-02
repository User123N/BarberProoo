export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/superadmin", "/reset-password", "/auth/"] }]
  };
}
