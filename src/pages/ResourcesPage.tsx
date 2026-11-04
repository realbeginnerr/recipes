import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Paperclip, ArrowUpRight, FolderOpen, Plus } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { PageIntro, SearchField } from '../components/catalog/CatalogControls'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { deleteResource, loadResources, resourceCategories, safeResourceUrl, saveResource, type ResourcePost } from '../services/resourceService'
import './ResourcesPage.css'

export function ResourcesPage() {
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const ko = language === 'ko'
  const labels = ko ? { all: '전체', guide: '가이드', template: '서식', reference: '참고 자료', other: '기타' } : { all: 'All', guide: 'Guides', template: 'Templates', reference: 'References', other: 'Other' }
  const [posts, setPosts] = useState<ResourcePost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState<ResourcePost | null>(null)
  const [draft, setDraft] = useState<ResourcePost | null>(null)
  const [file, setFile] = useState<File>()
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true); setLoadError(false)
    loadResources().then(value => { if (active) setPosts(value) }).catch(() => { if (active) setLoadError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])
  const filtered = posts.filter(post => (category === 'all' || category === post.category) && `${post.title} ${post.body} ${post.fileName}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  function edit(post?: ResourcePost) {
    setDraft(post ?? { id: crypto.randomUUID(), title: '', body: '', category: 'guide', createdAt: Date.now(), updatedAt: Date.now(), url: '', fileName: '', filePath: '' })
    setFile(undefined); setError('')
  }
  function cancel() {
    if (window.confirm(ko ? '작성을 취소할까요? 입력한 내용은 저장되지 않습니다.' : 'Discard these edits?')) { setDraft(null); setError('') }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!isAdmin || !draft || busy) return
    setBusy(true); setError('')
    try {
      const saved = await saveResource(draft, file)
      setPosts(current => [saved, ...current.filter(post => post.id !== saved.id)].sort((a, b) => b.createdAt - a.createdAt))
      setDraft(null); setSelected(saved)
    } catch { setError(ko ? '등록하지 못했습니다. 입력 내용과 연결·관리자 권한을 확인한 뒤 다시 시도해주세요.' : 'Unable to save. Check your entries, connection and admin permissions, then retry.') }
    finally { setBusy(false) }
  }
  async function remove(post: ResourcePost) {
    if (!isAdmin || busy || !window.confirm(ko ? '이 자료를 삭제할까요?' : 'Delete this resource?')) return
    setBusy(true); setError('')
    try { await deleteResource(post); setPosts(current => current.filter(item => item.id !== post.id)); setSelected(null) }
    catch { setError(ko ? '삭제하지 못했습니다. 다시 시도해주세요.' : 'Unable to delete. Please retry.') }
    finally { setBusy(false) }
  }
  const date = (value: number) => new Intl.DateTimeFormat(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
  return <div className="resources-page">
    <PageIntro title={ko ? '자료실' : 'Resources'} description="" backgroundImage={`${import.meta.env.BASE_URL}images/service/04.jpg`} />
    <div className="catalog-container resources-content">

      {error && <p role="alert" className="resources-error">{error}</p>}
      {isAdmin && draft ? <form className="resource-form" onSubmit={submit}>
        <Button type="button" variant="ghost" disabled={busy} onClick={cancel}>← {ko ? '뒤로가기' : 'Back'}</Button>
        <h2>{posts.some(post => post.id === draft.id) ? (ko ? '자료 수정' : 'Edit resource') : (ko ? '자료 등록' : 'Add resource')}</h2>
        <fieldset disabled={busy}>
          <label>{ko ? '제목' : 'Title'}<Input required maxLength={160} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>{ko ? '분류' : 'Category'}<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value as ResourcePost['category'] })}>{resourceCategories.map(item => <option key={item} value={item}>{labels[item]}</option>)}</select></label>
          <label>{ko ? '내용' : 'Description'}<Textarea required rows={6} value={draft.body} onChange={event => setDraft({ ...draft, body: event.target.value })} /></label>
          <label>{ko ? '자료 링크 (선택)' : 'Resource link (optional)'}<Input type="url" placeholder="https://" value={draft.url} onChange={event => setDraft({ ...draft, url: event.target.value, fileName: '', filePath: '' })} /></label>
          <label>{ko ? '첨부 파일 (최대 20MB)' : 'Attachment (up to 20MB)'}<input ref={fileInput} key={draft.id} type="file" onChange={event => {
            const next = event.target.files?.[0]
            if (next && next.size > 20 * 1024 * 1024) { setError(ko ? '20MB 이하의 파일을 선택해주세요.' : 'Choose a file up to 20MB.'); event.target.value = ''; setFile(undefined); return }
            setFile(next); setError('')
          }} /></label>
          <p className="resource-hint">{ko ? '파일을 선택하면 자료 링크 대신 첨부 파일이 등록됩니다.' : 'A selected file replaces the resource link.'}</p>
          {(draft.url || file) && <p className="resource-attachment">{file?.name || draft.fileName || draft.url}<Button type="button" variant="ghost" onClick={() => { setFile(undefined); setDraft({ ...draft, url: '', fileName: '', filePath: '' }); if (fileInput.current) fileInput.current.value = '' }}>{ko ? '첨부 제거' : 'Remove attachment'}</Button></p>}
          <div className="resource-form-actions"><Button type="button" variant="outline" onClick={cancel}>{ko ? '취소' : 'Cancel'}</Button><Button type="submit">{busy ? (ko ? '저장 중…' : 'Saving…') : (ko ? '저장' : 'Save')}</Button></div>
        </fieldset>
      </form> : selected ? <article className="resource-detail">
        <Button variant="ghost" onClick={() => { setSelected(null); setError('') }}>← {ko ? '목록으로' : 'Back to list'}</Button>
        <header><span className="resource-category">{labels[selected.category]}</span><h2>{selected.title}</h2><time dateTime={new Date(selected.createdAt).toISOString()}>{date(selected.createdAt)}</time></header>
        <div className="resource-body">{selected.body}</div>
        {safeResourceUrl(selected.url) && <a className="resource-download" href={safeResourceUrl(selected.url)} target="_blank" rel="noopener noreferrer"><Paperclip size={18} aria-hidden="true" />{selected.fileName || (ko ? '자료 링크 열기' : 'Open resource link')}<ArrowUpRight size={16} aria-hidden="true" /></a>}
        {isAdmin && <div className="resource-form-actions"><Button variant="outline" disabled={busy} onClick={() => edit(selected)}>{ko ? '수정' : 'Edit'}</Button><Button variant="destructive" disabled={busy} onClick={() => void remove(selected)}>{ko ? '삭제' : 'Delete'}</Button></div>}
      </article> : <>
        <div className="resources-toolbar"><div className="resources-categories" role="group" aria-label={ko ? '자료 분류' : 'Resource categories'}>{(['all', ...resourceCategories] as const).map(item => <Button key={item} variant="filter" size="compact" aria-pressed={category === item} onClick={() => setCategory(item)}>{labels[item]}</Button>)}</div><SearchField label={ko ? '자료 검색' : 'Search resources'} value={query} onValueChange={setQuery} />{isAdmin && <Button className="resources-add" onClick={() => edit()}><Plus aria-hidden="true" />{ko ? '자료 등록' : 'Add resource'}</Button>}</div>
        <p className="resources-count" role="status">{ko ? `전체 ${filtered.length}개의 자료` : `${filtered.length} resources`}</p>
        <div className="resources-board">
          <div className="resources-board-heading" aria-hidden="true"><span>{ko ? '번호' : 'No.'}</span><span>{ko ? '제목' : 'Title'}</span><span>{ko ? '등록일' : 'Date'}</span></div>
          {loading ? <p className="resources-empty" role="status">{ko ? '자료를 불러오는 중입니다…' : 'Loading resources…'}</p> : loadError ? <div className="resources-empty" role="alert"><p>{ko ? '자료를 불러오지 못했습니다.' : 'Unable to load resources.'}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>{ko ? '다시 시도' : 'Retry'}</Button></div> : !filtered.length ? <div className="resources-empty"><FolderOpen size={36} strokeWidth={1.3} aria-hidden="true" /><h2>{query || category !== 'all' ? (ko ? '검색 결과가 없습니다.' : 'No matching resources.') : (ko ? '아직 등록된 자료가 없습니다.' : 'No resources yet.')}</h2><p>{query || category !== 'all' ? (ko ? '다른 검색어나 분류를 선택해주세요.' : 'Try another search or category.') : (ko ? '공유할 자료가 등록되면 이곳에서 확인할 수 있어요.' : 'Shared resources will appear here.')}</p>{(query || category !== 'all') && <Button variant="outline" onClick={() => { setQuery(''); setCategory('all') }}>{ko ? '전체 자료 보기' : 'Show all resources'}</Button>}</div> : <ol className="resources-list">{filtered.map((post, index) => <li key={post.id}><span className="resource-number">{filtered.length - index}</span><button className="resource-title" onClick={() => setSelected(post)}><span className="resource-category">{labels[post.category]}</span><span>{post.title}</span>{post.url && <Paperclip size={15} aria-label={ko ? '첨부 자료 있음' : 'Attachment available'} />}</button><time dateTime={new Date(post.createdAt).toISOString()}>{date(post.createdAt)}</time></li>)}</ol>}
        </div>
      </>}
    </div>
  </div>
}
