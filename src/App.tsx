import { useEffect, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { CycleCalculationService as Cycle } from './domain/CycleCalculationService'
import { blankData, type CareData, type DailyCheckIn, type Method, type Mood, type Energy, type Pain, type Symptom, type TrustedContact } from './domain/models'
import { repository } from './storage/repository'
import { downloadData } from './application/exportService'
import { openComposer } from './application/sharingService'
import { COUNTRY_CALLING_CODES, DEFAULT_COUNTRY_CODE, flagEmoji } from './domain/countryCallingCodes'
import { setDailyCheckInReminder } from './application/notificationService'

type Tab = 'today' | 'track' | 'calendar' | 'insights' | 'circle' | 'privacy'
const today = () => new Date().toISOString().slice(0, 10)
const id = () => crypto.randomUUID()
const dateLabel = (d?: string) => d ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`)) : '—'
const symptoms: Symptom[] = ['Cramps','Headache','Bloating','Breast tenderness','Fatigue','Backache','Nausea','Acne','Mood changes','Other']
const greetingForHour = (hour: number) => hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 17 ? 'Good afternoon' : hour >= 17 && hour < 21 ? 'Good evening' : 'Good night'
const Nav = ({ tab, setTab }: {tab: Tab; setTab: (x: Tab) => void}) => <nav aria-label="Main navigation">{([['today','⌂','Today'],['track','＋','Track'],['calendar','□','Calendar'],['insights','⌁','Insights'],['circle','♡','Circle']] as const).map(([key, icon, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)} aria-current={tab === key ? 'page' : undefined}><span>{icon}</span>{label}</button>)}</nav>

function CheckIn({
  value,
  onSave,
  compact = false
}: {
  value?: DailyCheckIn
  onSave: (v: DailyCheckIn) => void
  compact?: boolean
}) {
  const [draft, setDraft] = useState<DailyCheckIn>(
    value ?? {
      date: today(),
      symptoms: []
    }
  )

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft(
      value ?? {
        date: today(),
        symptoms: []
      }
    )

    setSaved(false)
  }, [value])

  const updateDraft = (next: DailyCheckIn) => {
    setDraft(next)
    setSaved(false)
  }

  const choose = <T extends string>(
    field: 'mood' | 'energy' | 'pain',
    options: T[]
  ) => {
    return (
      <div className="choices">
        {options.map(option => (
          <button
            type="button"
            key={option}
            className={
              draft[field] === option
                ? 'selected'
                : ''
            }
            onClick={() =>
              updateDraft({
                ...draft,
                [field]: option
              })
            }
          >
            {option}
          </button>
        ))}
      </div>
    )
  }

  const saveCheckIn = () => {
    onSave(draft)
    setSaved(true)
  }

  return (
    <section className="card checkin">
      <div className="section-title">
        <div>
          <h2>
            {compact
              ? 'How are you feeling?'
              : "Today's check-in"}
          </h2>

          <p>
            Only add what feels useful.
          </p>
        </div>
      </div>

      <label>
        Mood
        {choose<Mood>('mood', [
          'Great',
          'Good',
          'Okay',
          'Low',
          'Difficult'
        ])}
      </label>

      <label>
        Energy
        {choose<Energy>('energy', [
          'High',
          'Good',
          'Moderate',
          'Low',
          'Very low'
        ])}
      </label>

      <label>
        Pain
        {choose<Pain>('pain', [
          'None',
          'Mild',
          'Moderate',
          'Strong',
          'Severe'
        ])}
      </label>

      {!compact && (
        <label>
          Symptoms

          <div className="choices">
            {symptoms.map(symptom => (
              <button
                type="button"
                key={symptom}
                className={
                  draft.symptoms.includes(symptom)
                    ? 'selected'
                    : ''
                }
                onClick={() =>
                  updateDraft({
                    ...draft,
                    symptoms: draft.symptoms.includes(
                      symptom
                    )
                      ? draft.symptoms.filter(
                          item => item !== symptom
                        )
                      : [
                          ...draft.symptoms,
                          symptom
                        ]
                  })
                }
              >
                {symptom}
              </button>
            ))}
          </div>
        </label>
      )}

      <label className="text-label">
        A note

        <textarea
          value={draft.note ?? ''}
          onChange={event =>
            updateDraft({
              ...draft,
              note: event.target.value
            })
          }
          placeholder="Anything you'd like to remember?"
        />
      </label>

      <button
        type="button"
        className="primary"
        onClick={saveCheckIn}
      >
        {saved
          ? '✓ Check-in saved'
          : 'Save check-in'}
      </button>

      {saved && (
        <p
          className="feedback"
          role="status"
          aria-live="polite"
        >
          ✓ Your daily check-in has been saved on this
          device.
        </p>
      )}
    </section>
  )
}

function Today({ data, setTab, save }: {data: CareData; setTab:(t:Tab)=>void; save:(x:CareData)=>void}) {
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours())
  useEffect(() => {
    const updateGreeting = () => setCurrentHour(new Date().getHours())
    const timer = window.setInterval(updateGreeting, 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const last = Cycle.sorted(data.periods).at(-1); const next = Cycle.calculateNextEstimatedPeriod(data.periods); const cycleDay = last ? Cycle.daysBetween(last.startDate, today()) + 1 : null; const checkin = data.checkins.find(c => c.date === today())
  const support = (text: string) => { sessionStorage.setItem('carecycle-request', text); setTab('circle') }
  const greeting = greetingForHour(currentHour)
  return <><header><div><span className="eyebrow">CARE CYCLE</span><h1>{data.profile?.name ? `${greeting}, ${data.profile.name}` : `${greeting}, welcome to CareCycle`}</h1></div><button className="icon" aria-label="Open privacy and profile" onClick={() => setTab('privacy')}>⚙</button></header>
    <section className="hero"><span className="pill">{cycleDay ? `Cycle day ${cycleDay}` : 'Your private space'}</span><h2>{last && last.endDate && last.endDate >= today() ? 'You are on your period' : 'Your cycle, at your pace'}</h2><p>{next ? <>Next period <strong>estimated</strong> around {dateLabel(next)}.</> : 'Keep tracking to build your personal cycle history.'}</p><button className="link" onClick={() => setTab('calendar')}>View calendar →</button></section>
    <CheckIn value={checkin} compact onSave={v => save({...data, checkins: [...data.checkins.filter(c => c.date !== v.date), v]})} />
    <section className="emergency card"><div className="section-title"><div><h2>Emergency</h2><p>Call your saved emergency contact using your phone's normal call function.</p></div></div>{data.profile?.emergencyMobile?.trim() ? <a className="emergency-button" href={`tel:${data.profile.emergencyMobile.replace(/[^0-9+]/g,'')}`} aria-label="Call emergency contact">☎ Call emergency contact</a> : <button className="outline" onClick={() => setTab('privacy')}>Add emergency number</button>}</section>
    <section className="support"><div className="section-title"><div><h2>Ask for support</h2><p>Choose what and who to share with.</p></div></div>{['Ask someone to check on me','Need menstrual supplies','Need someone to talk to','Need help getting home'].map(x => <button key={x} onClick={() => support(x)}>{x}<span>›</span></button>)}</section>
  </>
}

function Track({ data, save }: {data: CareData; save:(x:CareData)=>void}) {
  const [start, setStart] = useState(today()); const [end, setEnd] = useState(''); const [flow, setFlow] = useState<'Light'|'Medium'|'Heavy'>('Medium'); const [feedback, setFeedback] = useState('')
  const add = () => { const record = { id:id(), startDate:start, endDate:end || undefined, flow, createdAt:new Date().toISOString() }; const error = Cycle.validatePeriodEntry(record, data.periods); if (error) return setFeedback(error); save({...data, periods:[...data.periods, record]}); setFeedback('Period saved on this device.'); setEnd('') }
  const entry = data.checkins.find(c => c.date === today())
  return <><header><div><span className="eyebrow">PRIVATE LOG</span><h1>Track</h1></div></header><section className="card"><h2>Log period</h2><p>Record the first and final day of actual bleeding.</p><div className="field-grid"><label>Period start<input type="date" max={today()} value={start} onChange={e=>setStart(e.target.value)} /></label><label>Period end <small>optional</small><input type="date" min={start} max={today()} value={end} onChange={e=>setEnd(e.target.value)} /></label></div><label>Flow<div className="choices">{(['Light','Medium','Heavy'] as const).map(x=><button key={x} className={flow===x?'selected':''} onClick={()=>setFlow(x)}>{x}</button>)}</div></label><button className="primary" onClick={add}>Save period</button>{feedback && <p className="feedback" role="status">{feedback}</p>}</section><CheckIn value={entry} onSave={v=>save({...data,checkins:[...data.checkins.filter(c=>c.date!==v.date),v]})}/><section className="activity"><h2>Period history</h2>{data.periods.length ? Cycle.sorted(data.periods).reverse().map(p=><div key={p.id}><span><strong>{dateLabel(p.startDate)}</strong>{p.endDate && ` – ${dateLabel(p.endDate)}`}</span><button onClick={()=>save({...data,periods:data.periods.filter(x=>x.id!==p.id)})}>Remove</button></div>) : <p>Your cycle history will appear here as you track.</p>}</section></>
}

function Calendar({ data }: {data:CareData}) { const [month, setMonth] = useState(new Date(Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth(),1))); const y=month.getUTCFullYear(),m=month.getUTCMonth(),days=new Date(Date.UTC(y,m+1,0)).getUTCDate(),offset=month.getUTCDay(); const actual=new Set(data.periods.flatMap(p=>{const end=p.endDate??p.startDate;const arr=[];for(let d=p.startDate;d<=end;d=new Date(new Date(`${d}T00:00:00Z`).getTime()+86400000).toISOString().slice(0,10))arr.push(d);return arr})); const estimate=Cycle.calculateEstimatedWindow(data.periods); const inEstimate=(d:string)=>estimate && d>=estimate.start&&d<=estimate.end
 return <><header><div><span className="eyebrow">YOUR HISTORY</span><h1>Calendar</h1></div></header><section className="card calendar"><div className="month"><button onClick={()=>setMonth(new Date(Date.UTC(y,m-1,1)))} aria-label="Previous month">‹</button><h2>{month.toLocaleDateString(undefined,{month:'long',year:'numeric',timeZone:'UTC'})}</h2><button onClick={()=>setMonth(new Date(Date.UTC(y,m+1,1)))} aria-label="Next month">›</button></div><div className="week">{['S','M','T','W','T','F','S'].map((x,i)=><span key={i}>{x}</span>)}</div><div className="grid">{Array.from({length:offset},(_,i)=><i key={'b'+i}/>)}{Array.from({length:days},(_,i)=>{const d=`${y}-${String(m+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`; const ci=data.checkins.find(c=>c.date===d);return <button className={`${actual.has(d)?'actual':''} ${inEstimate(d)?'estimated':''} ${ci?'checked':''}`} key={d} title={ci?.note ?? d}>{i+1}</button>})}</div><div className="legend"><span><b className="actual-dot"/>Actual period</span><span><b className="estimate-dot"/>Estimated</span><span><b className="check-dot"/>Check-in</span></div></section></> }

function Insights({data}:{data:CareData}) { const lengths=Cycle.cycleLengths(data.periods); const range=Cycle.calculateCycleRange(data.periods); const common=Object.entries(data.checkins.flatMap(c=>c.symptoms).reduce<Record<string,number>>((a,s)=>({...a,[s]:(a[s]??0)+1}),{})).sort((a,b)=>b[1]-a[1]).slice(0,3); return <><header><div><span className="eyebrow">LOCAL-ONLY SUMMARY</span><h1>Your patterns</h1></div></header>{lengths.length ? <><section className="stats"><article><span>Average cycle</span><strong>{Cycle.calculateAverageCycleLength(data.periods)} days</strong></article><article><span>Median cycle</span><strong>{Cycle.calculateMedianCycleLength(data.periods)} days</strong></article><article><span>Cycle range</span><strong>{range?.min}–{range?.max} days</strong></article><article><span>Variability</span><strong>{Cycle.calculateCycleVariability(data.periods)} days</strong></article></section><section className="card"><h2>Recent entries</h2><p>Based only on the data you've logged. These are not medical conclusions.</p><div className="recent">{lengths.slice(-5).map((n,i)=><span key={i} style={{height:`${Math.min(90,n*2)}px`}}><i>{n}</i></span>)}</div></section>{common.length>0&&<section className="card"><h2>Commonly logged symptoms</h2><p>You recorded {common.map(([s,n])=>`${s} (${n})`).join(', ')} most often.</p></section>}</> : <section className="empty"><div>⌁</div><h2>Your insights will appear as you keep tracking.</h2><p>Add at least two period starts to see your personal cycle patterns. CareCycle never makes a diagnosis.</p></section>}</> }

function Circle({data,save}:{data:CareData;save:(x:CareData)=>void}) { const [form,setForm]=useState(false); const [contact,setContact]=useState<TrustedContact>({id:'',name:'',relationship:'Friend',countryCode:DEFAULT_COUNTRY_CODE,preferredMethod:'WhatsApp'}); const [request,setRequest]=useState(sessionStorage.getItem('carecycle-request')??'Check on me'); const [selected,setSelected]=useState(''); const [message,setMessage]=useState(''); const [status,setStatus]=useState(''); const [include,setInclude]=useState<string[]>([]); const choose=(c:TrustedContact)=>{setSelected(c.id);setMessage(template(request,c.name));sessionStorage.removeItem('carecycle-request')}; const add=()=>{if(!contact.name.trim())return; if(data.contacts.length>=5)return setStatus('You can have up to 5 people in your Trust Circle. Remove or replace someone first.'); save({...data,contacts:[...data.contacts,{...contact,id:id()}]});setForm(false);setStatus('')}; const c=data.contacts.find(x=>x.id===selected); const addHealthInfo=()=>{const check=data.checkins.find(x=>x.date===today());const next=Cycle.calculateNextEstimatedPeriod(data.periods);const parts:string[]=[];if(include.includes('cycle')&&data.periods.length)parts.push(`Current cycle day: ${Cycle.daysBetween(Cycle.sorted(data.periods).at(-1)!.startDate,today())+1}.`);if(include.includes('estimate')&&next)parts.push(`Next period estimate: around ${dateLabel(next)}.`);if(include.includes('mood')&&check?.mood)parts.push(`Today's mood: ${check.mood}.`);if(include.includes('energy')&&check?.energy)parts.push(`Today's energy: ${check.energy}.`);if(include.includes('pain')&&check?.pain)parts.push(`Today's pain: ${check.pain}.`);if(include.includes('symptoms')&&check?.symptoms.length)parts.push(`Symptoms: ${check.symptoms.join(', ')}.`);if(include.includes('note')&&check?.note)parts.push(`Note: ${check.note}`);return parts.length?`\n\nOptional health update: ${parts.join(' ')}`:''}
 return <><header><div><span className="eyebrow">YOUR PEOPLE</span><h1>Trust Circle</h1></div></header><section className="card"><div className="section-title"><div><h2>People you trust</h2><p>{data.contacts.length} of 5 people</p></div><button className="outline" disabled={data.contacts.length>=5} onClick={()=>setForm(true)}>Add person</button></div>{data.contacts.length ? data.contacts.map(x=><div className="contact" key={x.id}><button className="contact-main" onClick={()=>choose(x)}><b>{x.name}</b><span>{x.relationship} · {x.preferredMethod}</span></button><button className="remove" onClick={()=>save({...data,contacts:data.contacts.filter(c=>c.id!==x.id)})} aria-label={`Remove ${x.name}`}>×</button></div>) : <p>Add people you trust so you can quickly ask for support.</p>}{data.contacts.length===5&&<p className="feedback">Trust Circle is full. You can have up to 5 people.</p>}</section>
 {form&&<section className="card"><h2>Add trusted person</h2><label>Name<input value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})}/></label><label>Relationship<input value={contact.relationship} onChange={e=>setContact({...contact,relationship:e.target.value})}/></label><div className="phone-field"><label>Country code<select aria-label="Country calling code" value={contact.countryCode ?? DEFAULT_COUNTRY_CODE} onChange={e=>setContact({...contact,countryCode:e.target.value})}>{COUNTRY_CALLING_CODES.map(x=><option key={`${x.iso}-${x.code}`} value={x.code}>{flagEmoji(x.iso)} {x.name} ({x.code})</option>)}</select></label><label>Mobile number <small>without country code</small><input inputMode="tel" autoComplete="tel-national" placeholder="e.g. 01712345678" value={contact.mobile??''} onChange={e=>setContact({...contact,mobile:e.target.value})}/></label></div><small className="field-help">WhatsApp will combine the country code and number automatically. For Bangladesh, for example, +880 + 01712345678 becomes +8801712345678.</small><label>Email <small>optional</small><input type="email" value={contact.email??''} onChange={e=>setContact({...contact,email:e.target.value})}/></label><label>Preferred method<select value={contact.preferredMethod} onChange={e=>setContact({...contact,preferredMethod:e.target.value as Method})}>{(['WhatsApp','Messenger','SMS','Email','Share sheet'] as Method[]).map(x=><option key={x}>{x}</option>)}</select></label><div className="actions"><button className="outline" onClick={()=>setForm(false)}>Cancel</button><button className="primary" onClick={add}>Save person</button></div></section>}
 {data.contacts.length>0&&<section className="card composer"><h2>Prepare a support request</h2><label>Request<select value={request} onChange={e=>{setRequest(e.target.value);if(c)setMessage(template(e.target.value,c.name))}}>{['Check on me','Menstrual supplies','Someone to talk to','Help getting home','Health update','Custom request'].map(x=><option key={x}>{x}</option>)}</select></label><label>Recipient<select value={selected} onChange={e=>choose(data.contacts.find(c=>c.id===e.target.value)!) }><option value="">Choose someone</option>{data.contacts.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>{c&&<><label>Communication method<select value={c.preferredMethod} onChange={e=>save({...data,contacts:data.contacts.map(x=>x.id===c.id?{...x,preferredMethod:e.target.value as Method}:x)})}>{(['WhatsApp','Messenger','SMS','Email','Share sheet'] as Method[]).map(x=><option key={x}>{x}</option>)}</select></label><fieldset><legend>Include health information <small>all off by default</small></legend>{[['cycle','Current cycle day'],['estimate','Estimated period window'],['mood',"Today's mood"],['energy',"Today's energy"],['pain',"Today's pain"],['symptoms','Selected symptoms'],['note',"Today's note"]].map(([key,label])=><label className="switch" key={key}><input type="checkbox" checked={include.includes(key)} onChange={()=>setInclude(include.includes(key)?include.filter(x=>x!==key):[...include,key])}/><span>{label}</span></label>)}</fieldset><label>Message preview<textarea value={message} onChange={e=>setMessage(e.target.value)}/></label><p className="notice">CareCycle will only open an external composer. Please review and send there.</p><button className="primary" onClick={async()=>{const result=await openComposer(c.preferredMethod,c,message+addHealthInfo());setStatus(result==='opened' ? `${c.preferredMethod} opened. Review and send the message there.` : result==='unavailable' ? `Please enter a valid phone number for ${c.preferredMethod}.` : 'Something went wrong while preparing the message. Your data is still saved on this device.')}}>Open {c.preferredMethod}</button></>}{status&&<p className="feedback">{status}</p>}</section>}</> }

function Privacy({data,save}:{data:CareData;save:(x:CareData)=>void}) { const [profile,setProfile]=useState(data.profile??{name:'',mobile:'',emergencyMobile:''}); const [confirm,setConfirm]=useState(false); const [notice,setNotice]=useState(''); const reminder=async(enabled:boolean)=>{try{await setDailyCheckInReminder(enabled);save({...data,settings:{...data.settings,notifications:enabled}});setNotice(enabled?'A local 7 PM reminder is set.':'Local reminder turned off.')}catch{setNotice('Your device did not allow notifications. No reminder was set.')}}; return <><header><div><span className="eyebrow">YOUR CONTROL</span><h1>Privacy & profile</h1></div></header><section className="privacy-hero"><b>Your data stays on this device.</b><p>No account, CareCycle cloud, advertising, analytics, or AI. Sharing happens only when you choose it.</p></section><section className="card"><h2>Local profile</h2><label>Name<input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></label><label>Mobile number<input inputMode="tel" value={profile.mobile} onChange={e=>setProfile({...profile,mobile:e.target.value})}/></label><label>Emergency contact number<input inputMode="tel" placeholder="e.g. +8801XXXXXXXXX" value={profile.emergencyMobile??''} onChange={e=>setProfile({...profile,emergencyMobile:e.target.value})}/><small>Used only when you press the emergency call button. It opens your phone's normal dialer/call action.</small></label><button className="primary" onClick={()=>save({...data,profile})}>Save profile</button></section><section className="card"><h2>Your data</h2><p>Exported files can contain sensitive health information. Store them carefully.</p><div className="actions"><button className="outline" onClick={()=>downloadData(data,'json')}>Export JSON</button><button className="outline" onClick={()=>downloadData(data,'csv')}>Export CSV</button></div><button className="danger" onClick={()=>setConfirm(true)}>Delete all local data</button>{confirm&&<div className="confirm"><p>This permanently removes CareCycle data on this device. It cannot remove anything you already shared or exported.</p><div className="actions"><button className="outline" onClick={()=>setConfirm(false)}>Cancel</button><button className="danger" onClick={()=>save(blankData())}>Delete data</button></div></div>}</section><section className="card"><h2>Notifications & app lock</h2><p>Reminders are scheduled only on this device. CareCycle does not send push notifications.</p><label className="switch"><input type="checkbox" checked={data.settings.notifications} onChange={e=>void reminder(e.target.checked)}/><span>Local daily check-in reminder</span></label>{notice&&<p className="feedback">{notice}</p>}<label className="switch"><input type="checkbox" checked={data.settings.appLock} onChange={e=>save({...data,settings:{...data.settings,appLock:e.target.checked}})}/><span>Use device authentication when available</span></label><p className="notice">App lock needs a native biometric provider configured for the final Android/iOS release. It never uses a CareCycle password or server.</p></section><section className="card"><h2>Appearance</h2><p>Choose how CareCycle looks on this device.</p><div className="choices"><button className={data.settings.theme!=='dark'?'selected':''} onClick={()=>save({...data,settings:{...data.settings,theme:'light'}})}>☀ Light</button><button className={data.settings.theme==='dark'?'selected':''} onClick={()=>save({...data,settings:{...data.settings,theme:'dark'}})}>☾ Dark</button></div></section><section className="card about"><h2>About CareCycle</h2><p>Version 0.1.0 · Open-source privacy-first tracking.</p><p>CareCycle cannot control information after it is sent through another app, copied, captured in a screenshot, or exported.</p></section></> }
function template(request:string,name:string) { const t:Record<string,string>={'Check on me':`Hi ${name}, could you check in on me when you have a moment?`,'Menstrual supplies':`Hi ${name}, I could use some menstrual supplies today. Could you help me get some?`,'Someone to talk to':`Hi ${name}, I'm having a difficult day and would appreciate someone to talk to.`,'Help getting home':`Hi ${name}, I could use some help getting home. Are you available?`,'Health update':`Hi ${name}, I wanted to let you know I'm not feeling my best today.`,'Custom request':`Hi ${name}, `}; return t[request] }
function Onboarding({done}:{done:()=>void}) { return <main className="onboarding"><div className="mark">◌</div><span className="eyebrow">CARE CYCLE</span><h1>Track privately.<br/>Share safely.<br/>Get support.</h1><p>CareCycle keeps your information on your device. No account, no cloud health database, no advertising, no tracking, and no AI.</p><div className="privacy-list"><span>✓ Your data stays local</span><span>✓ You choose what to share</span><span>✓ Your health history is yours</span></div><button className="primary" onClick={done}>Continue privately</button><small>You can manage your data, export it, or delete it at any time.</small></main> }
export default function App(){const [data,setData]=useState<CareData|null>(null);const[tab,setTab]=useState<Tab>('today');const[history,setHistory]=useState<Tab[]>([]);useEffect(()=>{repository.load().then(setData)},[]);useEffect(()=>{if(data) document.documentElement.dataset.theme=data.settings.theme==='dark'?'dark':'light'},[data?.settings.theme]);const navigate=(next:Tab)=>{if(next===tab)return;setHistory(h=>[...h,tab]);setTab(next)};const goBack=()=>{setHistory(h=>{const next=h[h.length-1]??'today';setTab(next);return h.slice(0,-1)})};useEffect(()=>{const sub=CapacitorApp.addListener('backButton',({canGoBack})=>{if(history.length>0)goBack();else if(tab!=='today')setTab('today');else if(canGoBack)CapacitorApp.exitApp()});return()=>{sub.then(x=>x.remove())}},[history,tab]);const save=(next:CareData)=>{setData(next);repository.save(next)}; if(!data)return <main className="loading">Opening your private space…</main>;if(!data.settings.onboarded)return <Onboarding done={()=>save({...data,settings:{...data.settings,onboarded:true}})}/>;return <main className="app"><div className="content">{tab!=='today'&&<button className="back-button" onClick={goBack} aria-label="Go back">← Back</button>}{tab==='today'&&<Today data={data} setTab={navigate} save={save}/>} {tab==='track'&&<Track data={data} save={save}/>} {tab==='calendar'&&<Calendar data={data}/>} {tab==='insights'&&<Insights data={data}/>} {tab==='circle'&&<Circle data={data} save={save}/>} {tab==='privacy'&&<Privacy data={data} save={save}/>}</div>{tab!=='privacy'&&<Nav tab={tab} setTab={navigate}/>}</main>}
