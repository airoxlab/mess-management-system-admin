import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const forms = [
    {
      title: 'Student',
      description: 'For hostel & day scholars',
      href: '/students/form',
      icon: (
        <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      gradient: 'from-blue-500 via-blue-600 to-indigo-700',
      bgGradient: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
      hoverBorder: 'hover:border-blue-400',
    },
    {
      title: 'Faculty',
      description: 'For teaching faculty only',
      href: '/faculty/form',
      icon: (
        <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      gradient: 'from-emerald-500 via-green-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-200',
      hoverBorder: 'hover:border-emerald-400',
    },
    {
      title: 'Staff',
      description: 'Admin, technical & support',
      href: '/staffs/form',
      icon: (
        <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      gradient: 'from-violet-500 via-purple-500 to-fuchsia-600',
      bgGradient: 'from-violet-50 to-fuchsia-50',
      borderColor: 'border-violet-200',
      hoverBorder: 'hover:border-violet-400',
    },
  ];

  return (
    <div className="min-h-screen sm:h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-0 w-48 sm:w-64 h-48 sm:h-64 bg-gradient-to-br from-emerald-400/15 to-teal-400/15 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-6 sm:py-0 sm:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full blur-lg opacity-40 group-hover:opacity-60 transition duration-500 animate-pulse"></div>
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white shadow-2xl">
                <Image
                  src="/logo.png"
                  alt="Central Canteen Logo"
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
            </div>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent tracking-tight">
            Central Canteen
          </h1>
          <p className="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-lg font-medium tracking-wide">
            Membership Registration Portal
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-5xl">
          {forms.map((form) => (
            <Link key={form.href} href={form.href} className="group">
              <div className={`relative bg-gradient-to-br ${form.bgGradient} rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 sm:hover:-translate-y-3 hover:shadow-2xl border-2 ${form.borderColor} ${form.hoverBorder} h-full`}>
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${form.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

                {/* Content */}
                <div className="p-5 sm:p-8 flex flex-col items-center text-center relative">
                  {/* Icon */}
                  <div className={`w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl bg-gradient-to-br ${form.gradient} flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 mb-4 sm:mb-6`}>
                    {form.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors mb-1 sm:mb-2">
                    {form.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">
                    {form.description}
                  </p>

                  {/* Button */}
                  <div className={`inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-gradient-to-r ${form.gradient} text-white font-semibold text-sm shadow-lg group-hover:shadow-xl group-hover:gap-3 transition-all duration-300`}>
                    Apply Now
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center relative z-10">
        <p className="text-gray-400 text-xs sm:text-sm">
          &copy; {new Date().getFullYear()} Central Canteen. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
