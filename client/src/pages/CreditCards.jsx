import { useQuery } from '@tanstack/react-query'
import { creditCardsApi } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import { CreditCard, Calendar, Clock, ChevronRight } from 'lucide-react'

export default function CreditCards() {
  const { data: cards, isLoading } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: () => creditCardsApi.getAll().then(r => r.data.data.creditCards),
  })

  if (isLoading) {
    return <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cartes de crédit</h1>
        <p className="text-gray-600">Gérez vos cartes et cycles de facturation</p>
      </div>

      {cards?.length === 0 ? (
        <div className="card text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucune carte de crédit configurée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cards?.map((card) => (
            <CardDetail key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  )
}

function CardDetail({ card }) {
  const { data: cycleData } = useQuery({
    queryKey: ['credit-card-cycle', card.id],
    queryFn: () => creditCardsApi.getCurrentCycle(card.id).then(r => r.data.data),
    enabled: card.debitType === 'deferred',
  })

  const cycle = cycleData?.cycle

  return (
    <div className="card">
      <div className="flex items-start gap-4 mb-6">
        <div 
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: card.color + '20', color: card.color }}
        >
          <CreditCard className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{card.name}</h3>
          <p className="text-sm text-gray-500">
            {card.debitType === 'deferred' ? 'Débit différé' : 'Débit immédiat'}
            {card.cardNumberLast4 && ` •••• ${card.cardNumberLast4}`}
          </p>
        </div>
        {card.creditLimit && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Limite</p>
            <p className="font-semibold">{formatCurrency(card.creditLimit)}</p>
          </div>
        )}
      </div>

      {card.debitType === 'deferred' && cycle && (
        <>
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                Cycle en cours
              </div>
              <span className="badge bg-primary-100 text-primary-700">
                {cycle.status === 'open' ? 'Ouvert' : 'En attente'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Du {formatDate(cycle.cycleStartDate)} au {formatDate(cycle.cycleEndDate)}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total cycle</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(cycle.totalAmount || 0)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg text-amber-800">
            <Clock className="w-5 h-5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Prochain prélèvement</p>
              <p className="text-xs">{formatDate(cycle.debitDate)}</p>
            </div>
            <span className="font-semibold">{formatCurrency(cycle.totalAmount || 0)}</span>
          </div>

          {cycleData?.cycle?.transactions?.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Dernières opérations</h4>
              <div className="space-y-2">
                {cycleData.cycle.transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 truncate flex-1">{tx.description}</span>
                    <span className="font-medium ml-2">{formatCurrency(Math.abs(tx.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {card.debitType === 'immediate' && (
        <div className="text-center py-6 text-gray-500">
          <p>Les opérations sont débitées immédiatement</p>
        </div>
      )}
    </div>
  )
}
