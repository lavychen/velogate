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
import { useEffect, useId, useRef, useState } from 'react'

const inboundBeams = [
  {
    endY: 134,
    control: 0.475,
    color: '#a5b4fc',
    duration: '1.2s',
    begin: '0s',
  },
]
const outboundBeams = [
  { endY: 29, control: 0.475, color: '#6ee7b7', duration: '1.5s', begin: '0s' },
  {
    endY: 99,
    control: 0.45,
    color: '#fdba74',
    duration: '1.35s',
    begin: '-.4s',
  },
  {
    endY: 169,
    control: 0.45,
    color: '#93c5fd',
    duration: '1.65s',
    begin: '-.8s',
  },
  {
    endY: 239,
    control: 0.475,
    color: '#7dd3fc',
    duration: '1.4s',
    begin: '-1.1s',
  },
]

export function RoutingBeams(props: { outbound?: boolean }) {
  const id = useId()
  const svgRef = useRef<SVGSVGElement>(null)
  const beams = props.outbound ? outboundBeams : inboundBeams
  const [width, setWidth] = useState(props.outbound ? 80 : 48)

  // Keep SVG units equal to CSS pixels so the pulses stay round and visible
  // when the connector grows on a wide screen.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const initialWidth = svg.getBoundingClientRect().width
    if (initialWidth) setWidth(initialWidth)
    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width
      if (nextWidth) setWidth(nextWidth)
    })
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  return (
    <svg
      ref={svgRef}
      className='sign-in-connections'
      width={width}
      height={268}
      viewBox={`0 0 ${width} 268`}
      preserveAspectRatio='none'
      aria-hidden='true'
    >
      <defs>
        {beams.map((beam, index) => (
          <linearGradient
            key={beam.endY}
            id={`${id}-gradient-${index}`}
            x1='0%'
            y1='0%'
            x2='100%'
            y2='0%'
          >
            <stop offset='0%' stopColor='#818cf8' stopOpacity='.4' />
            <stop offset='100%' stopColor={beam.color} stopOpacity='.9' />
          </linearGradient>
        ))}
      </defs>
      {beams.map((beam, index) => {
        const path = `M0 134C${width * beam.control} 134 ${width * (1 - beam.control)} ${beam.endY} ${width} ${beam.endY}`
        return (
          <g key={beam.endY}>
            <path
              id={`${id}-path-${index}`}
              d={path}
              fill='none'
              stroke='white'
              strokeOpacity='.12'
              strokeWidth='1.3'
            />
            <path
              d={path}
              fill='none'
              stroke={`url(#${id}-gradient-${index})`}
              strokeWidth='1.4'
              className='sign-in-beam'
            />
            <g className='sign-in-motion-point' color={beam.color}>
              <circle r='7' fill='currentColor' opacity='.18' />
              <circle r='3.5' fill='currentColor' />
              <circle r='1.4' fill='white' />
              <animateMotion
                path={path}
                dur={beam.duration}
                repeatCount='indefinite'
                begin={beam.begin}
              />
            </g>
          </g>
        )
      })}
    </svg>
  )
}
