import { useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { sanitizeProductHtml, validWebUrl } from '../../utils/product'
import type { ProductImage } from '../../types/product'

export function ProductRichText({ value, onChange, images = [] }: { value: string; onChange: (value: string) => void; images?: ProductImage[] }) {
  const editor = useRef<HTMLDivElement>(null)
  const selection = useRef<Range | null>(null)
  useEffect(() => { if (editor.current && document.activeElement !== editor.current && editor.current.innerHTML !== value) editor.current.innerHTML = sanitizeProductHtml(value) }, [value])
  function rememberSelection() {
    const current = window.getSelection()
    if (current?.rangeCount && editor.current?.contains(current.anchorNode)) selection.current = current.getRangeAt(0).cloneRange()
  }
  function command(name: string, argument?: string) {
    editor.current?.focus()
    if (selection.current) { const current = window.getSelection(); current?.removeAllRanges(); current?.addRange(selection.current) }
    document.execCommand(name, false, argument)
    rememberSelection()
    onChange(sanitizeProductHtml(editor.current?.innerHTML ?? ''))
  }
  return <div className="product-richtext">
    <div className="product-richtext-toolbar" role="toolbar" aria-label="상세 설명 서식">
      {[['bold', '굵게'], ['italic', '기울임'], ['insertUnorderedList', '목록'], ['insertOrderedList', '번호 목록']].map(([name, label]) => <Button key={name} type="button" variant="ghost" onMouseDown={event => event.preventDefault()} onClick={() => command(name)}>{label}</Button>)}
      <Button type="button" variant="ghost" onMouseDown={event => event.preventDefault()} onClick={() => command('formatBlock', 'h2')}>소제목</Button>
      <Button type="button" variant="ghost" onMouseDown={event => event.preventDefault()} onClick={() => command('formatBlock', 'p')}>본문</Button>
      <Button type="button" variant="ghost" onMouseDown={event => event.preventDefault()} onClick={() => command('formatBlock', 'blockquote')}>인용</Button>
      <Button type="button" variant="ghost" onMouseDown={event => event.preventDefault()} onClick={() => command('insertHorizontalRule')}>구분선</Button>
      <Button type="button" variant="ghost" onMouseDown={event => event.preventDefault()} onClick={() => { const url = window.prompt('본문에 넣을 이미지의 http 또는 https 주소를 입력해 주세요.'); if (url && validWebUrl(url)) command('insertImage', url) }}>이미지 URL</Button>
      <Button type="button" variant="ghost" onMouseDown={event => event.preventDefault()} onClick={() => { const url = window.prompt('연결할 https 주소를 입력해 주세요.'); if (url && validWebUrl(url)) command('createLink', url) }}>링크</Button>
      <Button type="button" variant="ghost" onMouseDown={event => event.preventDefault()} onClick={() => command('removeFormat')}>서식 지우기</Button>
    </div>
    {images.length > 0 && <div className="product-inline-image-picker"><p>본문에 넣을 위치를 클릭한 뒤 등록한 이미지를 선택하세요.</p>{images.map((image, index) => <Button key={image.id} type="button" variant="ghost" onMouseDown={event => event.preventDefault()} onClick={() => command('insertImage', image.url)} aria-label={`본문에 ${image.alt || `${index + 1}번 이미지`} 삽입`}><img src={image.url} alt={image.alt || `${index + 1}번 이미지`} /></Button>)}</div>}
    <div ref={editor} className="product-richtext-editor" role="textbox" aria-label="상품 상세 설명" aria-multiline="true" contentEditable suppressContentEditableWarning onKeyUp={rememberSelection} onMouseUp={rememberSelection} onInput={() => onChange(editor.current?.innerHTML ?? '')} onBlur={() => onChange(sanitizeProductHtml(editor.current?.innerHTML ?? ''))} onPaste={event => {
      event.preventDefault()
      const html = event.clipboardData.getData('text/html')
      if (html) command('insertHTML', sanitizeProductHtml(html))
      else command('insertText', event.clipboardData.getData('text/plain'))
    }} />
  </div>
}
