import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { usePrefersReducedMotion } from '../../hooks/useMotion';

interface Datum {
  label: string;
  count: number;
}

/**
 * Single-series horizontal bar chart (magnitude by category → one hue, no legend).
 * Thin bars with rounded data-ends, direct value labels, recessive axes, hover tooltip,
 * and a screen-reader table carrying the same numbers.
 */
export function DistributionChart({ data, title, unit }: { data: Datum[]; title: string; unit: string }) {
  const height = data.length * 34 + 8;
  const reduced = usePrefersReducedMotion();
  return (
    <figure>
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 36, bottom: 0, left: 0 }}
            barCategoryGap={10}
          >
            <XAxis type="number" hide allowDecimals={false} domain={[0, (max: number) => Math.max(max, 1)]} />
            <YAxis
              type="category"
              dataKey="label"
              width={136}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: '#57534e' }}
            />
            <Tooltip
              cursor={{ fill: '#f6f4fa' }}
              contentStyle={{
                borderRadius: 10,
                border: '1px solid #e7e5e4',
                boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value} ${unit}`, '']}
              separator=""
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              barSize={14}
              isAnimationActive={!reduced}
              animationDuration={700}
            >
              {data.map((d) => (
                <Cell key={d.label} fill={d.count === 0 ? '#e7e5e4' : '#644b98'} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                style={{ fontSize: 12, fill: '#44403c', fontWeight: 500 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">{unit}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
