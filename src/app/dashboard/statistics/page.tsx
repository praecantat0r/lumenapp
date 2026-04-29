import dynamic from 'next/dynamic'

const StatisticsPage = dynamic(() => import('./StatisticsPage'), { ssr: false })

export default function Page() {
  return <StatisticsPage />
}
