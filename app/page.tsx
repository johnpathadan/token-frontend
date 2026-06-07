import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-black flex items-center justify-center min-h-screen w-full p-4 sm:p-8 md:p-12">
      <div className="flex flex-col items-center justify-center gap-6 sm:gap-8 max-w-sm sm:max-w-xl md:max-w-3xl lg:max-w-4xl box-border">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center tracking-tight text-amber-100">tokenplot.</h1>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center tracking-tight text-amber-100">
          Deploy your own fund from anywhere in the world
        </h2>
        <h4 className="text-lg sm:text-xl md:text-2xl text-center text-amber-100 font-normal leading-relaxed">
          Create your own custom, U.S. stock-backed index token in minutes, with
          fully dynamic allocations you can upgrade at any time
        </h4>
        <div className="bg-amber-100 rounded-xl px-6 py-3 shadow-md border border-gray-100 transition-transform hover:scale-105 duration-200">
          <h6 className="text-sm sm:text-base font-semibold text-black tracking-wide uppercase">
            <Link href="/create">
            Explore the prototype
            </Link>
          </h6>
        </div>
      </div>
    </div>
  );
}
