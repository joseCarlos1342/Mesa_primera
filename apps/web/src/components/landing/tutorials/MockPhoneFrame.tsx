'use client'

interface MockPhoneFrameProps {
  children: React.ReactNode
  className?: string
  landscape?: boolean
}

export function MockPhoneFrame({ children, className = '', landscape = false }: MockPhoneFrameProps) {
  if (landscape) {
    return (
      <div className={`relative mx-auto w-full ${className}`}>
        {/* Outer bezel - landscape */}
        <div className="relative rounded-[1.5rem] md:rounded-[2rem] bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-900 p-[5px] md:p-[6px] shadow-2xl shadow-black/70 ring-1 ring-white/10">
          <div className="relative rounded-[1.5rem] md:rounded-[2rem] bg-zinc-950 p-[2px] md:p-[3px]">
            <div className="relative rounded-[1.5rem] md:rounded-[2rem] overflow-hidden bg-[#073926]">
              {/* Side notch / camera */}
              <div className="absolute top-1/2 -translate-y-1/2 left-[5px] md:left-[6px] z-10">
                <div className="w-[14px] md:w-[18px] h-[12px] md:h-[14px] bg-black rounded-full flex items-center justify-center">
                  <div className="w-[5px] md:w-[6px] h-[5px] md:h-[6px] bg-zinc-800 rounded-full ring-1 ring-white/10" />
                </div>
              </div>

              {/* Screen content - landscape aspect ratio */}
              <div className="relative w-full aspect-[16/9] overflow-hidden">
                <div className="absolute inset-0 overflow-y-auto">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative mx-auto w-full max-w-[260px] md:max-w-[280px] ${className}`}>
      {/* Outer bezel */}
      <div className="relative rounded-[1.8rem] md:rounded-[2.2rem] bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-900 p-[5px] md:p-[6px] shadow-2xl shadow-black/70 ring-1 ring-white/10">
        {/* Inner bezel */}
        <div className="relative rounded-[1.6rem] md:rounded-[2rem] bg-zinc-950 p-[2px] md:p-[3px]">
          {/* Screen area */}
          <div className="relative rounded-[1.4rem] md:rounded-[1.8rem] overflow-hidden bg-slate-950">
            {/* Dynamic Island */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 mt-[5px] md:mt-[6px]">
              <div className="w-[75px] md:w-[85px] h-[18px] md:h-[20px] bg-black rounded-full flex items-center justify-center ring-1 ring-white/5">
                <div className="w-[6px] md:w-[7px] h-[6px] md:h-[7px] bg-zinc-800 rounded-full ring-1 ring-white/10" />
              </div>
            </div>

            {/* Screen content */}
            <div className="relative w-full aspect-[9/16] overflow-hidden">
              <div className="absolute inset-0 overflow-y-auto">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}