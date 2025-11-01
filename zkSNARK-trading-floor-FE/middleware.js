import { NextResponse } from "next/server";

export function middleware(request) {
  // Lấy cookies để kiểm tra session (Express session sử dụng 'connect.sid')
  const sessionCookie = request.cookies.get("connect.sid");

  // Các route cần bảo vệ
  const protectedPaths = ["/Dashboard", "/UserProfile"];
  const authPaths = ["/Login"];

  const { pathname } = request.nextUrl;

  // Nếu đang ở trang login và đã có session, redirect về dashboard
  if (authPaths.some((path) => pathname.startsWith(path)) && sessionCookie) {
    return NextResponse.redirect(new URL("/Dashboard", request.url));
  }

  // Nếu ở route được bảo vệ mà không có session, redirect về login
  if (
    protectedPaths.some((path) => pathname.startsWith(path)) &&
    !sessionCookie
  ) {
    return NextResponse.redirect(new URL("/Login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/Dashboard/:path*",
    "/UserProfile/:path*",
    "/Login",
    // Exclude api routes và static files
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
