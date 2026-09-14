import './LeaveHistory.css'
export type LeaveEvent = { id: string; actorUserId: string; action: string; note: string | null; createdAt: string }
const actions: Record<string, string> = {
  Requested: 'ช่างส่งคำขอลา', Approved: 'ร้านอนุมัติการลา', Rejected: 'ร้านไม่อนุมัติการลา',
  Withdrawn: 'ช่างถอนคำขอ', CancellationRequested: 'ช่างขอยกเลิกการลา',
  CancellationApproved: 'ร้านยืนยันยกเลิกการลา', CancellationRejected: 'ร้านไม่ให้ยกเลิกการลา',
}
export function LeaveHistory({ history = [] }: { history?: LeaveEvent[] }) {
  if (!history.length) return null
  return <details className="leave-history"><summary>ประวัติการดำเนินการ ({history.length})</summary>
    <ol>{history.map(event => <li key={event.id}>
      <strong>{actions[event.action] ?? event.action}</strong>
      <small>{new Date(event.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' })}</small>
      {event.note && <p>{event.note}</p>}
    </li>)}</ol>
  </details>
}
