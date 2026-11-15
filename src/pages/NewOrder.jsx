import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useToast } from '../components/Toast'
import { getOrCreateOrder } from '../services/orders'
import { ICON } from '../lib/ui'

// Opens the live order for a table (or starts a new one), then shows it.
export default function NewOrder() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    let alive = true
    getOrCreateOrder(tableId)
      .then((id) => alive && navigate(`/orders/${id}`, { replace: true }))
      .catch((err) => {
        if (!alive) return
        toast.error(err.message)
        navigate('/tables', { replace: true })
      })
    return () => {
      alive = false
    }
  }, [tableId, navigate, toast])

  return (
    <div className="flex min-h-[60dvh] items-center justify-center text-primary">
      <Loader2 className={`${ICON} size-8 animate-spin`} />
    </div>
  )
}
