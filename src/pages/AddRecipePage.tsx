import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { saveRecipeToFirestore } from '../services/recipeService'
import type { FirestoreRecipe } from '../services/recipeService'

type ParsedRow = {
  name: string
  amount: string
  unit: string
  carbs: string
  protein: string
  fat: string
}

function parseIngredientText(text: string): ParsedRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const cols = line.split('\t')
      return {
        name: cols[0]?.trim() ?? '',
        amount: cols[1]?.trim() ?? '',
        unit: cols[2]?.trim() ?? '',
        carbs: cols[3]?.trim() ?? '',
        protein: cols[4]?.trim() ?? '',
        fat: cols[5]?.trim() ?? '',
      }
    })
    .filter((row) => row.name.length > 0)
}

export function AddRecipePage() {
  const { language } = useLanguage()
  const [recipeName, setRecipeName] = useState('')
  const [recipeNameKo, setRecipeNameKo] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [parsed, setParsed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  function handleConfirm() {
    const rows = parseIngredientText(pastedText)
    setParsedRows(rows)
    setParsed(true)
    setSavedMessage('')
  }

  function handleReset() {
    setParsed(false)
    setParsedRows([])
    setSavedMessage('')
  }

  async function handleSave() {
    if (!recipeName.trim()) {
      alert(language === 'ko' ? '레시피 이름(영문)을 입력해주세요.' : 'Please enter a recipe name.')
      return
    }
    setSaving(true)
    try {
      const recipe: Omit<FirestoreRecipe, 'id' | 'createdAt'> = {
        name: recipeName.trim(),
        nameKo: recipeNameKo.trim() || recipeName.trim(),
        imageUrl: '',
        memo: '',
        tasteRating: 4,
        timeRating: 4,
        items: parsedRows.map((row) => ({
          name: row.name,
          nameKo: row.name,
          amount: Number.parseFloat(row.amount) || 0,
          unit: row.unit || 'g',
          carbs: Number.parseFloat(row.carbs) || 0,
          protein: Number.parseFloat(row.protein) || 0,
          fat: Number.parseFloat(row.fat) || 0,
        })),
      }
      await saveRecipeToFirestore(recipe)
      setSavedMessage(language === 'ko' ? '저장 완료!' : 'Saved!')
      setRecipeName('')
      setRecipeNameKo('')
      setPastedText('')
      setParsedRows([])
      setParsed(false)
    } catch (err) {
      console.error(err)
      alert(language === 'ko' ? '저장 실패. 다시 시도해주세요.' : 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isKo = language === 'ko'

  return (
    <section className="page">
      <h2 className="page__heading">
        {isKo ? '레시피 추가' : 'Add Recipe'}
      </h2>

      <div className="add-recipe__form">
        <div className="add-recipe__field">
          <label className="add-recipe__label">
            {isKo ? '레시피 이름 (영문)' : 'Recipe name (EN)'}
          </label>
          <input
            type="text"
            className="add-recipe__input"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="e.g. Chili Con Carne"
          />
        </div>
        <div className="add-recipe__field">
          <label className="add-recipe__label">
            {isKo ? '레시피 이름 (한글)' : 'Recipe name (KO)'}
          </label>
          <input
            type="text"
            className="add-recipe__input"
            value={recipeNameKo}
            onChange={(e) => setRecipeNameKo(e.target.value)}
            placeholder="예) 칠리 콘 카르네"
          />
        </div>

        <div className="add-recipe__field">
          <label className="add-recipe__label">
            {isKo
              ? '재료 데이터 붙여넣기 (탭으로 열 구분, 줄바꿈으로 행 구분)'
              : 'Paste ingredient data (tabs between columns, newlines between rows)'}
          </label>
          <p className="add-recipe__hint">
            {isKo
              ? '열 순서: 재료명 → 양 → 단위 → 탄수화물 → 단백질 → 지방'
              : 'Column order: name → amount → unit → carbs → protein → fat'}
          </p>
          <textarea
            className="add-recipe__textarea"
            value={pastedText}
            onChange={(e) => { setPastedText(e.target.value); setParsed(false) }}
            placeholder={isKo
              ? '닭가슴살\t200\tg\t0\t46\t4\n브로콜리\t100\tg\t7\t3\t0'
              : 'Chicken breast\t200\tg\t0\t46\t4\nBroccoli\t100\tg\t7\t3\t0'}
            rows={8}
          />
        </div>

        <button
          type="button"
          className="add-recipe__confirm-btn"
          onClick={handleConfirm}
          disabled={pastedText.trim().length === 0}
        >
          {isKo ? '확인' : 'Confirm'}
        </button>
      </div>

      {parsed && parsedRows.length > 0 && (
        <div className="add-recipe__preview">
          <div className="add-recipe__preview-header">
            <h3 className="add-recipe__preview-title">
              {isKo ? '미리보기' : 'Preview'}
            </h3>
            <button type="button" className="edit-inline__cancel-btn" onClick={handleReset}>
              {isKo ? '다시 입력' : 'Reset'}
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isKo ? '재료' : 'Ingredient'}</th>
                  <th>{isKo ? '양' : 'Amount'}</th>
                  <th>{isKo ? '단위' : 'Unit'}</th>
                  <th>{isKo ? '탄수화물' : 'Carbs'}</th>
                  <th>{isKo ? '단백질' : 'Protein'}</th>
                  <th>{isKo ? '지방' : 'Fat'}</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, i) => (
                  <tr key={i}>
                    <td>{row.name}</td>
                    <td style={{ textAlign: 'right' }}>{row.amount}</td>
                    <td style={{ textAlign: 'right' }}>{row.unit}</td>
                    <td style={{ textAlign: 'right' }}>{row.carbs}</td>
                    <td style={{ textAlign: 'right' }}>{row.protein}</td>
                    <td style={{ textAlign: 'right' }}>{row.fat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              className="add-recipe__save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? (isKo ? '저장 중...' : 'Saving...')
                : (isKo ? '레시피 저장' : 'Save Recipe')}
            </button>
            {savedMessage && (
              <span style={{ color: '#16a34a', fontWeight: 600 }}>{savedMessage}</span>
            )}
          </div>
        </div>
      )}

      {parsed && parsedRows.length === 0 && (
        <p className="add-recipe__error">
          {isKo
            ? '파싱할 수 있는 데이터가 없습니다. 형식을 확인해주세요.'
            : 'No data could be parsed. Please check the format.'}
        </p>
      )}
    </section>
  )
}
