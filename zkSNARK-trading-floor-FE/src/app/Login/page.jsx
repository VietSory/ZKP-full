"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import Link from "next/link";
export default function AuthPage() {
  const router = useRouter();
  const { login, signup, loading, isAuthenticated } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    name: "",
    wallet: "",
    username: "",
    password: "",
  });


  useEffect(() => {
    if (isAuthenticated) {
      router.push("/Dashboard");
    }
  }, [isAuthenticated, router]);

 
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLogin) {
 
      const result = await login(form.username, form.password);

      if (result.success) {
        alert("Đăng nhập thành công!");
        router.push("/Dashboard");
      } else {
        alert("Đăng nhập thất bại: " + result.error);
      }
    } else {
    
      if (!form.name || !form.wallet) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
      }

      const result = await signup(form.username, form.password, form.wallet);

      if (result.success) {
        alert("Đăng ký thành công!");
        router.push("/Dashboard");
      } else {
        alert("Đăng ký thất bại: " + result.error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center px-4 py-6">
      <div className="max-w-md w-full bg-white p-6 md:p-8 rounded-xl shadow-2xl">
        <h2 className="text-xl md:text-2xl font-bold text-center mb-4 md:mb-6 text-gray-800">
          {isLogin ? "Đăng nhập" : "Đăng ký"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          {!isLogin && (
            <>
              <input
                name="name"
                type="text"
                placeholder="Tên của bạn"
                value={form.name}
                onChange={handleChange}
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
                required
              />
              <input
                name="wallet"
                type="text"
                placeholder="Địa chỉ ví (AddressWallet)"
                value={form.wallet}
                onChange={handleChange}
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
                required
              />
            </>
          )}

          <input
            name="username"
            type="text"
            placeholder="Tên đăng nhập"
            value={form.username}
            onChange={handleChange}
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Mật khẩu"
            value={form.password}
            onChange={handleChange}
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 md:py-3 rounded-lg transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-sm md:text-base"
          >
            {loading ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Đăng ký"}
          </button>
        </form>

        <p className="text-center mt-4 md:mt-6 text-sm md:text-base text-gray-600">
          Chưa có tài khoản?{" "}
          <Link
            href="/Signup"
            className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
