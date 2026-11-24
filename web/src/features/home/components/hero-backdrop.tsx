/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useTheme } from '@/context/theme-provider'

export function HeroBackdrop() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  return (
    <div
      aria-hidden='true'
      className='home-backdrop pointer-events-none absolute inset-0'
    >
      <div className='home-grid absolute inset-0' />
      <div className='absolute inset-0 overflow-hidden'>
        <div className='home-orb home-orb-indigo' />
        <div className='home-orb home-orb-orange' />
        <div className='home-orb home-orb-cyan' />
      </div>
      <svg
        aria-hidden='true'
        viewBox='0 0 1440 760'
        preserveAspectRatio='xMidYMin slice'
        className='pointer-events-none absolute inset-0 h-full w-full'
      >
        <defs>
          <linearGradient id='vgBeamIndigo' x1='0%' y1='0%' x2='100%' y2='100%'>
            <stop offset='0%' stopColor='#4F46E5' stopOpacity='0' />
            <stop
              offset='50%'
              stopColor='#4F46E5'
              stopOpacity={isDark ? '0.95' : '0.75'}
            />
            <stop offset='100%' stopColor='#0EA5E9' stopOpacity='0' />
          </linearGradient>
          <linearGradient id='vgBeamOrange' x1='100%' y1='0%' x2='0%' y2='100%'>
            <stop offset='0%' stopColor='#F97316' stopOpacity='0' />
            <stop
              offset='50%'
              stopColor='#F97316'
              stopOpacity={isDark ? '0.9' : '0.72'}
            />
            <stop offset='100%' stopColor='#4F46E5' stopOpacity='0' />
          </linearGradient>
          <linearGradient id='vgBeamCyan' x1='0%' y1='0%' x2='0%' y2='100%'>
            <stop offset='0%' stopColor='#0EA5E9' stopOpacity='0' />
            <stop
              offset='50%'
              stopColor='#10B981'
              stopOpacity={isDark ? '0.85' : '0.68'}
            />
            <stop offset='100%' stopColor='#4F46E5' stopOpacity='0' />
          </linearGradient>
        </defs>

        {/* 底层极细静态贝塞尔路由线 */}
        <g
          fill='none'
          stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.065)'}
          strokeWidth='1'
        >
          <path d='M 110 85 C 320 85, 420 340, 720 340 C 1020 340, 1120 85, 1330 85' />
          <path d='M 40 270 C 280 270, 440 340, 720 340 C 1000 340, 1160 270, 1400 270' />
          <path d='M 720 340 C 560 340, 460 520, 340 720' />
          <path d='M 720 340 C 660 440, 620 580, 595 720' />
          <path d='M 720 340 C 780 440, 820 580, 845 720' />
          <path d='M 720 340 C 880 340, 980 520, 1100 720' />
        </g>

        {/* 5 道错峰平滑流光光束 */}
        <g fill='none' strokeWidth='1.75' strokeLinecap='round'>
          <path
            className='vg-beam'
            stroke='url(#vgBeamIndigo)'
            d='M 110 85 C 320 85, 420 340, 720 340 C 880 340, 980 520, 1100 720'
          />
          <path
            className='vg-beam vg-beam-2'
            stroke='url(#vgBeamOrange)'
            d='M 1330 85 C 1120 85, 1020 340, 720 340 C 560 340, 460 520, 340 720'
          />
          <path
            className='vg-beam vg-beam-3'
            stroke='url(#vgBeamCyan)'
            d='M 40 270 C 280 270, 440 340, 720 340 C 780 440, 820 580, 845 720'
          />
          <path
            className='vg-beam vg-beam-4'
            stroke='url(#vgBeamIndigo)'
            d='M 1400 270 C 1160 270, 1000 340, 720 340 C 660 440, 620 580, 595 720'
          />
          <path
            className='vg-beam vg-beam-5'
            stroke='url(#vgBeamOrange)'
            d='M 110 85 C 320 85, 420 340, 720 340 C 660 440, 620 580, 595 720'
          />
        </g>

        {/* 关键汇流与路由节点脉冲圆点 */}
        <g>
          <circle
            cx='720'
            cy='340'
            r='4'
            fill='#4F46E5'
            className='vg-node-pulse'
          />
          <circle
            cx='315'
            cy='195'
            r='2.5'
            fill='#4F46E5'
            className='vg-node-pulse'
            style={{ animationDelay: '0.8s' }}
          />
          <circle
            cx='1125'
            cy='195'
            r='2.5'
            fill='#F97316'
            className='vg-node-pulse'
            style={{ animationDelay: '1.5s' }}
          />
          <circle
            cx='485'
            cy='490'
            r='2.5'
            fill='#0EA5E9'
            className='vg-node-pulse'
            style={{ animationDelay: '2.1s' }}
          />
          <circle
            cx='955'
            cy='490'
            r='2.5'
            fill='#10B981'
            className='vg-node-pulse'
            style={{ animationDelay: '2.7s' }}
          />
        </g>
      </svg>

      <div className='home-spotlight absolute inset-0 hidden transition-opacity duration-300 md:block' />
      <div className='home-hero-fade absolute inset-x-0 bottom-0 h-28' />
    </div>
  )
}
