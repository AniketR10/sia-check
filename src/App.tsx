import { useSia } from './sia/SiaContext'
import { Onboarding } from './components/Onboarding'
import { Dashboard } from './components/Dashboard'

export default function App() {
  const { status, sdk } = useSia()

  if (status === 'connected' && sdk) {
    return <Dashboard sdk={sdk} />
  }
  return <Onboarding />
}
