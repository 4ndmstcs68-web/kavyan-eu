// Contactformulier → SalesPilot (prospect + melding in de mailbox).
// Zonder JavaScript werkt het formulier ook: de server stuurt je terug naar
// deze pagina met ?verzonden=1 of ?fout=1.
(function () {
  var form = document.querySelector('form[data-contact]')
  if (!form) return
  var en = (document.documentElement.lang || '').slice(0, 2) === 'en'
  var T = en
    ? { ok: 'Thanks, your message has arrived. You will hear from me within one working day.', fout: 'Sending failed. Please try again, or mail me directly.', bezig: 'Sending…' }
    : { ok: 'Bedankt, je bericht is aangekomen. Je hoort binnen één werkdag van mij.', fout: 'Versturen lukte niet. Probeer het opnieuw, of mail me rechtstreeks.', bezig: 'Bezig met versturen…' }

  var status = document.createElement('p')
  status.className = 'form-status'
  status.setAttribute('role', 'status')
  status.style.cssText = 'margin-top:12px;font-weight:600'
  form.appendChild(status)

  function toon(soort) {
    status.textContent = T[soort]
    status.style.color = soort === 'fout' ? '#b3261e' : ''
  }

  var q = new URLSearchParams(location.search)
  if (q.has('verzonden')) toon('ok')
  if (q.has('fout')) toon('fout')

  form.addEventListener('submit', function (e) {
    if (!window.fetch || !window.URLSearchParams) return
    e.preventDefault()
    var knop = form.querySelector('button[type=submit]')
    if (knop) knop.disabled = true
    toon('bezig')
    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(new FormData(form)).toString(),
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status)
      form.reset()
      toon('ok')
    }).catch(function () {
      toon('fout')
    }).then(function () {
      if (knop) knop.disabled = false
    })
  })
})()
