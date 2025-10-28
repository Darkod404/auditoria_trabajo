'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Area {
  id: number
  name: string
}

interface Question {
  id: number
  text: string
  severity: number
  code: string
}

interface Answer {
  value: boolean
  observation?: string
}

interface Audit {
  id: number
  areaId: number
  areaName: string
  code: string
  questions: any[]
  answers: Record<number, boolean>
  date: string
  percentage: number
}

export default function Dashboard() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [activeModule, setActiveModule] = useState('dashboard')
  const [areas, setAreas] = useState<Area[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [audits, setAudits] = useState<Audit[]>([])
  
  const [newArea, setNewArea] = useState('')
  const [newQuestion, setNewQuestion] = useState('')
  const [severity, setSeverity] = useState(1)
  const [questionCode, setQuestionCode] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [selectedArea, setSelectedArea] = useState<number | null>(null)
  const [auditCode, setAuditCode] = useState('')

  useEffect(() => {
    const loggedIn = sessionStorage.getItem('loggedIn')
    const user = sessionStorage.getItem('username')
    
    if (loggedIn !== 'true') {
      router.push('/')
      return
    }
    
    setUsername(user || 'user')
    loadData()
  }, [])

  const loadData = () => {
    const savedAreas = sessionStorage.getItem('areas')
    const savedQuestions = sessionStorage.getItem('questions')
    const savedAudits = sessionStorage.getItem('audits')
    
    if (savedAreas) setAreas(JSON.parse(savedAreas))
    if (savedQuestions) setQuestions(JSON.parse(savedQuestions))
    if (savedAudits) setAudits(JSON.parse(savedAudits))
  }

  const handleLogout = () => {
    sessionStorage.removeItem('loggedIn')
    sessionStorage.removeItem('username')
    router.push('/')
  }

  const handleAddArea = () => {
    if (!newArea.trim()) return
    
    const newId = areas.length > 0 ? Math.max(...areas.map(a => a.id)) + 1 : 1
    const updated = [...areas, { id: newId, name: newArea }]
    setAreas(updated)
    sessionStorage.setItem('areas', JSON.stringify(updated))
    setNewArea('')
  }

  const handleAddQuestion = () => {
    if (!newQuestion.trim() || !questionCode.trim()) return
    
    const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1
    const updated = [...questions, { 
      id: newId, 
      text: newQuestion, 
      severity,
      code: questionCode 
    }]
    setQuestions(updated)
    sessionStorage.setItem('questions', JSON.stringify(updated))
    setNewQuestion('')
    setQuestionCode('')
    setSeverity(1)
  }

  const handleUpdateQuestion = (questionId: number, updatedData: { text?: string; severity?: number; code?: string }) => {
    const updated = questions.map(q => 
      q.id === questionId ? { ...q, ...updatedData } : q
    )
    setQuestions(updated)
    sessionStorage.setItem('questions', JSON.stringify(updated))
  }

  const handleDeleteQuestion = (questionId: number) => {
    if (!confirm('¿Está seguro de que desea eliminar esta pregunta?')) return
    
    const updated = questions.filter(q => q.id !== questionId)
    setQuestions(updated)
    sessionStorage.setItem('questions', JSON.stringify(updated))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    const newQuestions: Question[] = []
    lines.forEach((line, index) => {
      const newId = questions.length + index + 1
      
      // Si la línea contiene "|", separa pregunta y severidad
      // Ejemplo: "¿Pregunta?|5" -> text: "¿Pregunta?", severity: 5
      let questionText = line.trim()
      let questionSeverity = 1
      
      if (line.includes('|')) {
        const parts = line.split('|')
        questionText = parts[0].trim()
        const severityValue = parseInt(parts[1]?.trim() || '1')
        questionSeverity = isNaN(severityValue) ? 1 : Math.max(1, Math.min(10, severityValue))
      }
      
      newQuestions.push({
        id: newId,
        text: questionText,
        severity: questionSeverity,
        code: questionCode || 'DEFAULT'
      })
    })
    
    const updated = [...questions, ...newQuestions]
    setQuestions(updated)
    sessionStorage.setItem('questions', JSON.stringify(updated))
    setUploadFile(null)
    e.target.value = ''
  }

  const handleStartAudit = () => {
    if (!selectedArea || !auditCode.trim()) return
    
    const area = areas.find(a => a.id === selectedArea)
    if (!area) return
    
    const codeQuestions = questions.filter(q => q.code === auditCode)
    if (codeQuestions.length === 0) {
      alert('No hay preguntas para ese código')
      return
    }

    const newId = audits.length > 0 ? Math.max(...audits.map(a => a.id)) + 1 : 1
    const audit: Audit = {
      id: newId,
      areaId: selectedArea,
      areaName: area.name,
      code: auditCode,
      questions: codeQuestions,
      answers: {},
      date: new Date().toISOString(),
      percentage: 0
    }

    console.log('Iniciando auditoría:', audit)
    console.log('Preguntas encontradas:', codeQuestions.length)

    setActiveModule('audit-' + newId)
    // Save in sessionStorage as currentAudit
    sessionStorage.setItem('currentAudit', JSON.stringify(audit))
  }

  const saveAudit = (auditId: number) => {
    const currentAuditStr = sessionStorage.getItem('currentAudit')
    if (!currentAuditStr) return
    
    const currentAudit: Audit = JSON.parse(currentAuditStr)
    const updatedAudits = [...audits.filter(a => a.id !== currentAudit.id), currentAudit]
    setAudits(updatedAudits)
    sessionStorage.setItem('audits', JSON.stringify(updatedAudits))
    sessionStorage.removeItem('currentAudit')
    setActiveModule('dashboard')
  }

  // Get current audit from sessionStorage if it starts with 'audit-'
  let currentAudit = null
  if (activeModule.startsWith('audit-')) {
    const sessionAudit = sessionStorage.getItem('currentAudit')
    if (sessionAudit) {
      currentAudit = JSON.parse(sessionAudit)
    } else {
      // Fallback to audits array if not in sessionStorage
      const auditId = parseInt(activeModule.replace('audit-', ''))
      currentAudit = audits.find(a => a.id === auditId)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Sistema de Auditoría</h1>
        <div className="flex items-center gap-4">
          <span>Usuario: {username}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {activeModule === 'dashboard' && (
        <div className="container mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6 text-white">Módulos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button
              onClick={() => setActiveModule('areas')}
              className="bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition text-left hover:bg-gray-700"
            >
              <h3 className="text-xl font-bold mb-2 text-white">Gestionar Áreas</h3>
              <p className="text-gray-400">Agregar y visualizar áreas</p>
            </button>
            <button
              onClick={() => setActiveModule('questions')}
              className="bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition text-left hover:bg-gray-700"
            >
              <h3 className="text-xl font-bold mb-2 text-white">Agregar Preguntas</h3>
              <p className="text-gray-400">Cargar preguntas manualmente o por archivo</p>
            </button>
            <button
              onClick={() => setActiveModule('create-audit')}
              className="bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition text-left hover:bg-gray-700"
            >
              <h3 className="text-xl font-bold mb-2 text-white">Realizar Auditoría</h3>
              <p className="text-gray-400">Crear y completar auditorías</p>
            </button>
            <button
              onClick={() => setActiveModule('summary')}
              className="bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition text-left hover:bg-gray-700"
            >
              <h3 className="text-xl font-bold mb-2 text-white">Resumen</h3>
              <p className="text-gray-400">Ver resumen de auditorías</p>
            </button>
            <button
              onClick={() => setActiveModule('reports')}
              className="bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition text-left hover:bg-gray-700"
            >
              <h3 className="text-xl font-bold mb-2 text-white">Reportes</h3>
              <p className="text-gray-400">Generar diferentes tipos de reportes</p>
            </button>
          </div>
        </div>
      )}

      {activeModule === 'areas' && (
        <div className="container mx-auto p-6">
          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Gestión de Áreas</h2>
              <button
                onClick={() => setActiveModule('dashboard')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Volver
              </button>
            </div>
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Nombre del área"
                className="flex-1 px-4 py-2 border rounded bg-gray-700 text-white border-gray-600 placeholder-gray-400"
              />
              <button
                onClick={handleAddArea}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Agregar
              </button>
            </div>
            <div className="space-y-2">
              {areas.map(area => (
                <div key={area.id} className="p-3 border rounded flex justify-between items-center bg-gray-700 border-gray-600">
                  <span className="text-white">{area.name}</span>
                  <span className="text-gray-400">ID: {area.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeModule === 'questions' && (
        <div className="container mx-auto p-6">
          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Agregar Preguntas</h2>
              <button
                onClick={() => setActiveModule('dashboard')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Volver
              </button>
            </div>
            <div className="space-y-6">
              <div className="border p-4 rounded bg-gray-700 border-gray-600">
                <h3 className="font-bold mb-3 text-white">Agregar Manualmente</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={questionCode}
                    onChange={(e) => setQuestionCode(e.target.value)}
                    placeholder="Código de preguntas"
                    className="w-full px-4 py-2 border rounded bg-gray-800 text-white border-gray-600 placeholder-gray-400"
                  />
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Texto de la pregunta"
                    className="w-full px-4 py-2 border rounded bg-gray-800 text-white border-gray-600 placeholder-gray-400"
                  />
                  <div>
                    <label className="text-gray-300">Gravedad (1-10): </label>
                    <input
                      type="number"
                      value={severity}
                      onChange={(e) => setSeverity(Number(e.target.value))}
                      min="1"
                      max="10"
                      className="w-24 px-4 py-2 border rounded bg-gray-800 text-white border-gray-600"
                    />
                  </div>
                  <button
                    onClick={handleAddQuestion}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  >
                    Agregar Pregunta
                  </button>
                </div>
              </div>
              <div className="border p-4 rounded bg-gray-700 border-gray-600">
                <h3 className="font-bold mb-3 text-white">Cargar desde archivo .txt</h3>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="mb-3"
                />
                <input
                  type="text"
                  value={questionCode}
                  onChange={(e) => setQuestionCode(e.target.value)}
                  placeholder="Código para las preguntas"
                  className="w-full px-4 py-2 border rounded bg-gray-800 text-white border-gray-600 placeholder-gray-400"
                />
                <p className="text-sm text-gray-400 mt-2">Cada línea del archivo será una pregunta</p>
              </div>
            </div>
            <QuestionViewer 
              questions={questions} 
              onUpdateQuestion={handleUpdateQuestion}
              onDeleteQuestion={handleDeleteQuestion}
            />
          </div>
        </div>
      )}

      {activeModule === 'create-audit' && (
        <CreateAudit 
          areas={areas}
          auditCode={auditCode}
          setAuditCode={(code: string) => {
            setAuditCode(code)
          }}
          selectedArea={selectedArea}
          setSelectedArea={setSelectedArea}
          onStart={handleStartAudit}
          onBack={() => setActiveModule('dashboard')}
          questions={questions}
        />
      )}

      {activeModule.startsWith('audit-') && currentAudit && (
        <PerformAudit
          audit={currentAudit}
          onComplete={saveAudit}
          onBack={() => setActiveModule('dashboard')}
        />
      )}
      
      {activeModule.startsWith('audit-') && !currentAudit && (
        <div className="container mx-auto p-6">
          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-white mb-4">Error: No se pudo cargar la auditoría</p>
            <button
              onClick={() => setActiveModule('dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      )}

      {activeModule === 'summary' && (
        <Summary
          audits={audits}
          onBack={() => setActiveModule('dashboard')}
        />
      )}

      {activeModule === 'reports' && (
        <Reports
          audits={audits}
          questions={questions}
          onBack={() => setActiveModule('dashboard')}
          onSelect={(module: string) => setActiveModule(module)}
        />
      )}

      {activeModule === 'report-excel-questions' && (
        <ExportExcelQuestions
          audits={audits}
          areas={areas}
          onBack={() => setActiveModule('reports')}
        />
      )}

      {activeModule === 'report-executive-summary' && (
        <ExecutiveSummary
          audits={audits}
          areas={areas}
          onBack={() => setActiveModule('reports')}
        />
      )}

      {activeModule === 'report-detailed-summary' && (
        <DetailedSummary
          audits={audits}
          onBack={() => setActiveModule('reports')}
        />
      )}

      {activeModule === 'report-complete-audit' && (
        <CompleteAudit
          audits={audits}
          onBack={() => setActiveModule('reports')}
        />
      )}
    </div>
  )
}

function CreateAudit({ areas, auditCode, setAuditCode, selectedArea, setSelectedArea, onStart, onBack, questions }: any) {
  // Obtener códigos únicos de preguntas con su información
  const uniqueCodes = Array.from(new Set(questions.map((q: any) => q.code).filter((code: string) => code && code !== 'DEFAULT')))
    .map(code => ({
      code,
      count: questions.filter((q: any) => q.code === code).length
    }))
  
  const [searchArea, setSearchArea] = useState('')
  const [searchCode, setSearchCode] = useState('')
  const [showAreaDropdown, setShowAreaDropdown] = useState(false)
  const [showCodeDropdown, setShowCodeDropdown] = useState(false)
  
  // Sincronizar searchCode con auditCode
  useEffect(() => {
    if (auditCode) {
      setSearchCode(auditCode)
    }
  }, [auditCode])
  
  const filteredAreas = areas.filter((area: any) => 
    area.name.toLowerCase().includes(searchArea.toLowerCase())
  )
  
  const filteredCodes = uniqueCodes.filter((item: any) =>
    item.code.toLowerCase().includes(searchCode.toLowerCase())
  )
  
  return (
    <div className="container mx-auto p-6">
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Crear Auditoría</h2>
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Volver
          </button>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <label className="block font-semibold mb-2 text-gray-300">Seleccionar Área</label>
            <div className="relative">
              <input
                type="text"
                value={searchArea}
                onChange={(e) => {
                  setSearchArea(e.target.value)
                  setShowAreaDropdown(true)
                }}
                onFocus={() => setShowAreaDropdown(true)}
                placeholder="Buscar área..."
                className="w-full px-4 py-2 border rounded bg-gray-700 text-white border-gray-600 placeholder-gray-400"
              />
              {showAreaDropdown && (
                <>
                  <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded max-h-48 overflow-y-auto">
                    {filteredAreas.length > 0 ? (
                      filteredAreas.map((area: any) => (
                        <div
                          key={area.id}
                          onClick={() => {
                            setSelectedArea(area.id)
                            setSearchArea(area.name)
                            setShowAreaDropdown(false)
                          }}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-600 text-white text-sm"
                        >
                          {area.name} <span className="text-gray-400">(ID: {area.id})</span>
          </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-400 text-sm">No se encontraron áreas</div>
                    )}
                  </div>
                  <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setShowAreaDropdown(false)}
                  ></div>
                </>
              )}
            </div>
            {selectedArea && (
              <p className="text-sm text-green-400 mt-1">Área seleccionada: {areas.find((a: any) => a.id === selectedArea)?.name}</p>
            )}
          </div>

          <div className="relative">
            <label className="block font-semibold mb-2 text-gray-300">Código de Preguntas</label>
            <div className="relative">
            <input
              type="text"
                value={searchCode}
                onChange={(e) => {
                  const value = e.target.value
                  setSearchCode(value)
                  setAuditCode(value)
                  setShowCodeDropdown(true)
                }}
                onFocus={() => setShowCodeDropdown(true)}
                placeholder="Buscar o ingresar código..."
              className="w-full px-4 py-2 border rounded bg-gray-700 text-white border-gray-600 placeholder-gray-400"
            />
              {showCodeDropdown && uniqueCodes.length > 0 && (
                <>
                  <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded max-h-48 overflow-y-auto">
                    {filteredCodes.length > 0 ? (
                      filteredCodes.map((item: any) => (
                        <div
                          key={item.code}
                          onClick={() => {
                            setAuditCode(item.code)
                            setSearchCode(item.code)
                            setShowCodeDropdown(false)
                          }}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-600 text-white text-sm flex justify-between items-center"
                        >
                          <span>{item.code}</span>
                          <span className="text-gray-400 text-xs">{item.count} pregunta{item.count !== 1 ? 's' : ''}</span>
          </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-400 text-sm">No se encontraron códigos</div>
                    )}
                  </div>
                  <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setShowCodeDropdown(false)}
                  ></div>
                </>
              )}
            </div>
            {auditCode && (
              <p className="text-sm text-green-400 mt-1">Código: {auditCode}</p>
            )}
          </div>

          <button
            onClick={onStart}
            disabled={!selectedArea || !auditCode}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Iniciar Auditoría
          </button>
        </div>
      </div>
    </div>
  )
}

function PerformAudit({ audit, onComplete, onBack }: any) {
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [observation, setObservation] = useState('')

  useEffect(() => {
    if (audit) {
      // Convert old format to new format
      const formattedAnswers: Record<number, Answer> = {}
      Object.keys(audit.answers || {}).forEach((key) => {
        const oldAnswer = audit.answers[key]
        formattedAnswers[parseInt(key)] = {
          value: oldAnswer?.value ?? oldAnswer,
          observation: oldAnswer?.observation || ''
        }
      })
      setAnswers(formattedAnswers)
    }
  }, [audit])

  if (!audit) return null

  const questions = audit.questions || []
  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0
  const currentAnswer = answers[currentQuestion?.id]

  const handleAnswer = (answer: boolean) => {
    const updated = { 
      ...answers, 
      [currentQuestion.id]: {
        value: answer,
        observation: observation || ''
      }
    }
    setAnswers(updated)
    setObservation('') // Reset observation for next question
    
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Complete audit
      const totalWeight = questions.reduce((sum: number, q: any) => sum + q.severity, 0)
      const positiveWeight = questions.reduce((sum: number, q: any) => {
        const answerData = updated[q.id]
        return sum + (answerData?.value ? q.severity : 0)
      }, 0)
      const percentage = totalWeight > 0 ? (positiveWeight / totalWeight) * 100 : 0

      const completedAudit = {
        ...audit,
        answers: updated,
        percentage: percentage
      }
      
      sessionStorage.setItem('currentAudit', JSON.stringify(completedAudit))
      onComplete(audit.id)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Auditoría - {audit.areaName}</h2>
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Cancelar
          </button>
        </div>
        <div className="mb-4">
          <div className="bg-gray-700 rounded h-4">
            <div 
              className="bg-blue-600 h-4 rounded transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Pregunta {currentIndex + 1} de {questions.length}
          </p>
        </div>
        {currentQuestion && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-700 rounded">
              <p className="text-xl text-white">{currentQuestion.text}</p>
            </div>
            
            {/* Campo de observación */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Observaciones (opcional)
              </label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Agregar una observación o comentario sobre esta pregunta..."
                className="w-full px-4 py-2 border rounded bg-gray-700 text-white border-gray-600 placeholder-gray-400 h-24 resize-none"
              />
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => handleAnswer(true)}
                className="flex-1 bg-green-600 text-white py-4 rounded hover:bg-green-700 text-lg font-semibold"
              >
                SÍ
              </button>
              <button
                onClick={() => handleAnswer(false)}
                className="flex-1 bg-red-600 text-white py-4 rounded hover:bg-red-700 text-lg font-semibold"
              >
                NO
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Summary({ audits, onBack }: any) {
  return (
    <div className="container mx-auto p-6">
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Resumen de Auditorías</h2>
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Volver
          </button>
        </div>
        {audits.length === 0 ? (
          <p className="text-gray-400">No hay auditorías registradas</p>
        ) : (
          <div className="space-y-4">
            {audits.map((audit: any) => (
              <div key={audit.id} className="border rounded p-4 bg-gray-700 border-gray-600">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-white">{audit.areaName}</h3>
                    <p className="text-sm text-gray-400">Código: {audit.code}</p>
                    <p className="text-sm text-gray-400">
                      Fecha: {new Date(audit.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{audit.percentage.toFixed(1)}%</p>
                    <p className="text-sm text-gray-400">Cumplimiento</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {audit.questions.map((q: any) => {
                    const answerData = audit.answers[q.id]
                    const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
                    const observation = typeof answerData === 'object' ? answerData?.observation : ''
                    return (
                      <div key={q.id} className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`w-3 h-3 rounded-full ${answerValue ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="text-gray-300">{q.text}</span>
                    </div>
                        {observation && (
                          <div className="ml-5 text-xs text-gray-400 italic">
                            📝 {observation}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Reports({ audits, questions, onBack, onSelect }: any) {
  return (
    <div className="container mx-auto p-6">
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Reportes</h2>
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Volver
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onSelect('report-excel-questions')}
            className="bg-blue-600 p-6 rounded-lg hover:bg-blue-700 text-left"
          >
            <h3 className="text-xl font-bold mb-2 text-white">Exportar a Excel - Preguntas</h3>
            <p className="text-gray-200">Exportar todas las preguntas existentes</p>
          </button>
          <button
            onClick={() => onSelect('report-executive-summary')}
            className="bg-green-600 p-6 rounded-lg hover:bg-green-700 text-left"
          >
            <h3 className="text-xl font-bold mb-2 text-white">Resumen Ejecutivo</h3>
            <p className="text-gray-200">Vista general de las auditorías</p>
          </button>
          <button
            onClick={() => onSelect('report-detailed-summary')}
            className="bg-purple-600 p-6 rounded-lg hover:bg-purple-700 text-left"
          >
            <h3 className="text-xl font-bold mb-2 text-white">Resumen Detallado</h3>
            <p className="text-gray-200">Análisis completo por preguntas</p>
          </button>
          <button
            onClick={() => onSelect('report-complete-audit')}
            className="bg-orange-600 p-6 rounded-lg hover:bg-orange-700 text-left"
          >
            <h3 className="text-xl font-bold mb-2 text-white">Auditoría Completa</h3>
            <p className="text-gray-200">Informe completo con todos los detalles</p>
          </button>
        </div>
      </div>
    </div>
  )
}

function ExportExcelQuestions({ audits, areas, onBack }: any) {
  const [selectedAudit, setSelectedAudit] = useState<any>(null)
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<number | null>(null)
  
  // Filtrar auditorías por área si hay filtro seleccionado
  const filteredAudits = selectedAreaFilter 
    ? audits.filter((a: any) => a.areaId === selectedAreaFilter)
    : audits
  
  // Ordenar por fecha de más reciente a más antigua
  const sortedAudits = [...filteredAudits].sort((a: any, b: any) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
  
  const exportToExcel = () => {
    if (!selectedAudit) {
      alert('Por favor seleccione una auditoría')
      return
    }

    import('xlsx').then((XLSX) => {
      // Crear workbook
      const wb = XLSX.utils.book_new()
      
      // Crear workbook con estilos (necesitamos ExcelJS para estilos)
      // Por ahora creamos formato mejorado con espacios y estructura
      const data = []
      
      // Título principal con formato mejorado
      data.push(['REPORTE DE AUDITORÍA INFORMÁTICA'])
        data.push([])
      
      // Información de la auditoría
      data.push(['ÁREA AUDITADA:', selectedAudit.areaName])
      data.push(['CÓDIGO DE AUDITORÍA:', selectedAudit.code])
      data.push(['FECHA DE REALIZACIÓN:', new Date(selectedAudit.date).toLocaleDateString()])
      data.push(['FECHA Y HORA:', new Date(selectedAudit.date).toLocaleString('es-ES')])
      data.push([])
      
      // Encabezados de la tabla
      data.push(['#', 'PREGUNTA', 'ESTADO', 'OBSERVACIONES'])
      
      // Datos de preguntas
      selectedAudit.questions.forEach((q: any, index: number) => {
        const answerData = selectedAudit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        const observation = typeof answerData === 'object' ? (answerData?.observation || '') : ''
        const status = answerValue ? 'Cumple' : 'No Cumple'
          data.push([
          index + 1,
            q.text,
          status,
          observation
          ])
        })
        
        data.push([])
        data.push([])
      
      // Resumen con formato mejorado
      data.push(['='.repeat(80)])
      data.push(['RESUMEN DEL CUMPLIMIENTO'])
      data.push(['='.repeat(80)])
      data.push([])
      data.push(['PORCENTAJE DE CUMPLIMIENTO:', `${selectedAudit.percentage.toFixed(1)}%`])
      const passed = selectedAudit.questions.filter((q: any) => {
        const answerData = selectedAudit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        return answerValue
      }).length
      const total = selectedAudit.questions.length
      data.push(['PREGUNTAS CUMPLIDAS:', `${passed} de ${total}`])
      data.push(['PREGUNTAS NO CUMPLIDAS:', `${total - passed} de ${total}`])
      data.push([])
      
      // Evaluación
      const evaluation = selectedAudit.percentage >= 80 ? 'EXCELENTE' : 
                        selectedAudit.percentage >= 60 ? 'BUENO' :
                        selectedAudit.percentage >= 40 ? 'REGULAR' : 'REQUIERE MEJORA'
      data.push(['EVALUACIÓN GENERAL:', evaluation])
      data.push(['='.repeat(80)])
      
      // Crear worksheet
      const ws = XLSX.utils.aoa_to_sheet(data)
      
      // Configurar anchos de columna para mejor visualización
      ws['!cols'] = [
        { wch: 6 },   // Columna #
        { wch: 65 },  // Columna Pregunta
        { wch: 18 },  // Columna Estado
        { wch: 50 }   // Columna Observaciones
      ]
      
      // Agregar una fila vacía después del encabezado para separación visual
      if (ws['A11']) {
        ws['A11'].s = { fill: { fgColor: { rgb: "E0E0E0" } } }
      }
      
      XLSX.utils.book_append_sheet(wb, ws, selectedAudit.areaName)
      XLSX.writeFile(wb, `respuestas_${selectedAudit.areaName}_${selectedAudit.code}.xlsx`)
    })
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Exportar Respuestas por Área</h2>
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Volver
          </button>
        </div>
        <div className="space-y-4">
          {/* Filtro por área */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Filtrar por Área (Opcional)</label>
            <select
              value={selectedAreaFilter || ''}
              onChange={(e) => setSelectedAreaFilter(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border rounded bg-gray-700 text-white border-gray-600"
            >
              <option value="">Todas las áreas</option>
              {areas.map((area: any) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
            {selectedAreaFilter && (
              <p className="text-sm text-green-400 mt-1">
                Mostrando {filteredAudits.length} auditoría(s) de {areas.find((a: any) => a.id === selectedAreaFilter)?.name}
              </p>
            )}
          </div>
          
          <p className="text-gray-300">Seleccione una auditoría para exportar las respuestas por área</p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {sortedAudits.map((audit: any) => (
              <div
                key={audit.id}
                onClick={() => setSelectedAudit(audit)}
                className={`p-3 border rounded cursor-pointer transition ${
                  selectedAudit?.id === audit.id
                    ? 'bg-blue-600 border-blue-500'
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-white font-medium">{audit.areaName}</span>
                  <span className="text-gray-300 text-sm">{audit.percentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>{audit.code}</span>
                  <span>{new Date(audit.date).toLocaleString('es-ES', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={exportToExcel}
            disabled={!selectedAudit}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Exportar a Excel
          </button>
        </div>
      </div>
    </div>
  )
}

function generateDynamicAnalysis(audit: any, passed: number, total: number, evaluation: string): string {
  const { areaName, percentage, questions, answers } = audit
  
  // Calcular métricas adicionales
  const failedCount = total - passed
  const passRate = passed / total
  const riskLevel = percentage < 40 ? 'CRÍTICO' : percentage < 60 ? 'ALTO' : percentage < 80 ? 'MODERADO' : 'BAJO'
  
  // Identificar áreas problemáticas (preguntas no cumplidas)
  const failedQuestions = questions.filter((q: any) => {
    const answerData = answers[q.id]
    const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
    return !answerValue
  })
  
  // Analizar por severidad
  const highSeverityFailed = failedQuestions.filter((q: any) => q.severity >= 8).length
  const mediumSeverityFailed = failedQuestions.filter((q: any) => q.severity >= 5 && q.severity < 8).length
  const lowSeverityFailed = failedQuestions.filter((q: any) => q.severity < 5).length
  
  // Calcular impacto total
  const totalSeverityWeight = questions.reduce((sum: number, q: any) => sum + q.severity, 0)
  const failedSeverityWeight = failedQuestions.reduce((sum: number, q: any) => sum + q.severity, 0)
  const impactPercentage = totalSeverityWeight > 0 ? (failedSeverityWeight / totalSeverityWeight) * 100 : 0
  
  // Generar análisis contextual
  let analysis = ''
  
  // Introducción contextual
  analysis += `La auditoría informática realizada al área de ${areaName} el ${new Date(audit.date).toLocaleDateString('es-ES')} presenta un nivel de cumplimiento ${evaluation}. `
  
  // Análisis de cumplimiento
  if (percentage >= 90) {
    analysis += `Con un ${percentage.toFixed(1)}% de cumplimiento, esta área demuestra un desempeño ejemplar en seguridad informática. `
  } else if (percentage >= 70) {
    analysis += `Con un ${percentage.toFixed(1)}% de cumplimiento, el área muestra un buen nivel de madurez en sus controles de seguridad. `
  } else if (percentage >= 50) {
    analysis += `Con un ${percentage.toFixed(1)}% de cumplimiento, existen oportunidades claras de mejora en los controles implementados. `
  } else {
    analysis += `Con un ${percentage.toFixed(1)}% de cumplimiento, se identifican deficiencias significativas que requieren atención inmediata. `
  }
  
  // Análisis cuantitativo
  analysis += `De un total de ${total} controles evaluados, ${passed} (${(passRate * 100).toFixed(0)}%) fueron implementados correctamente, mientras que ${failedCount} (${((failedCount/total)*100).toFixed(0)}%) presentan deficiencias. `
  
  // Análisis de severidad e impacto
  if (failedQuestions.length > 0) {
    analysis += `El análisis de las áreas no cumplidas revela: `
    
    if (highSeverityFailed > 0) {
      analysis += `${highSeverityFailed} control(es) de ALTA CRITICIDAD (severidad ≥8), lo que representa un riesgo significativo para la seguridad informática del área. `
    }
    
    if (mediumSeverityFailed > 0) {
      analysis += `${mediumSeverityFailed} control(es) de severidad MEDIA (5-7) que afectan la robustez de los controles. `
    }
    
    if (lowSeverityFailed > 0) {
      analysis += `${lowSeverityFailed} control(es) de menor criticidad, que aunque menos urgentes, contribuyen al nivel general de madurez. `
    }
    
    analysis += `Considerando el peso relativo de los controles no cumplidos, el impacto real en la seguridad informática se estima en ${impactPercentage.toFixed(1)}% del total del programa de seguridad. `
  }
  
  // Evaluación de riesgo
  analysis += `El nivel de riesgo general se clasifica como ${riskLevel}. `
  
  // Recomendaciones basadas en los resultados
  if (percentage >= 80) {
    analysis += `Se recomienda mantener los altos estándares actuales, implementar mejoras continuas en las áreas identificadas, y considerar la adopción de mejores prácticas adicionales. La capacitación continua del personal y la revisión periódica de controles contribuirán a mantener este nivel de excelencia.`
  } else if (percentage >= 60) {
    analysis += `Se recomienda desarrollar un plan de acción estructurado con priorización de las deficiencias de mayor severidad. La asignación de recursos específicos y la definición de responsables permitirán cerrar las brechas identificadas. Es fundamental establecer revisiones periódicas para monitorear el progreso de las mejoras implementadas.`
  } else if (percentage >= 40) {
    analysis += `Se recomienda URGENTEMENTE desarrollar e implementar un plan de acción inmediato y comprensivo. Se deben asignar recursos prioritarios para abordar las deficiencias críticas y de alta severidad. La dirección del área debe involucrarse activamente para asegurar el cumplimiento de los plazos establecidos en el plan de remediación. La auditoría de seguimiento debe realizarse en un plazo no mayor a 3 meses.`
  } else {
    analysis += `Se requiere INTERVENCIÓN INMEDIATA por parte de la dirección ejecutiva y de seguridad informática. Es imperativo asignar recursos especializados y establecer un programa de remediación agresivo con metas a corto, mediano y largo plazo. Todas las deficiencias críticas deben ser abordadas en un plazo máximo de 30 días. Se recomienda realizar una auditoría de seguimiento mensual hasta alcanzar al menos un 60% de cumplimiento. La situación actual expone a la organización a riesgos operativos y regulatorios significativos.`
  }
  
  return analysis
}

function ExecutiveSummary({ audits, areas, onBack }: any) {
  const [selectedAudit, setSelectedAudit] = useState<any>(null)
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<number | null>(null)
  
  // Filtrar auditorías por área si hay filtro seleccionado
  const filteredAudits = selectedAreaFilter 
    ? audits.filter((a: any) => a.areaId === selectedAreaFilter)
    : audits
  
  // Ordenar por fecha de más reciente a más antigua
  const sortedAudits = [...filteredAudits].sort((a: any, b: any) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
  
  const generatePDF = () => {
    if (!selectedAudit) {
      alert('Por favor seleccione una auditoría')
      return
    }

    import('jspdf').then((jsPDFModule: any) => {
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF || jsPDFModule
      const doc = new jsPDF()
      
      // Cálculos
      const passed = selectedAudit.questions.filter((q: any) => {
        const answerData = selectedAudit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        return answerValue
      }).length
      const total = selectedAudit.questions.length
      const evaluation = selectedAudit.percentage >= 80 ? 'EXCELENTE' : 
                        selectedAudit.percentage >= 60 ? 'BUENO' :
                        selectedAudit.percentage >= 40 ? 'REGULAR' : 'REQUIERE MEJORA'
      
      let yPos = 20
      
      // Título
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('REPORTE EJECUTIVO', 105, yPos, { align: 'center' })
      yPos += 8
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.text('AUDITORÍA INFORMÁTICA', 105, yPos, { align: 'center' })
      yPos += 15
      
      // Línea separadora
      doc.setLineWidth(0.5)
      doc.line(20, yPos, 190, yPos)
      yPos += 10
      
      // Información de la auditoría
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('INFORMACIÓN DE LA AUDITORÍA', 20, yPos)
      yPos += 7
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text('Fecha de Realización:', 20, yPos)
      doc.text(new Date(selectedAudit.date).toLocaleDateString('es-ES'), 70, yPos)
      yPos += 6
      
      doc.text('Fecha y Hora:', 20, yPos)
      doc.text(new Date(selectedAudit.date).toLocaleString('es-ES'), 70, yPos)
      yPos += 6
      
      doc.text('Área Auditada:', 20, yPos)
      doc.text(selectedAudit.areaName, 70, yPos)
      yPos += 6
      
      doc.text('Código de Auditoría:', 20, yPos)
      doc.text(selectedAudit.code, 70, yPos)
      yPos += 12
      
      // Línea separadora
      doc.line(20, yPos, 190, yPos)
      yPos += 10
      
      // Resultados
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('RESULTADOS', 20, yPos)
      yPos += 8
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text('Porcentaje de Cumplimiento:', 20, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(`${selectedAudit.percentage.toFixed(1)}%`, 80, yPos)
      yPos += 8
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text('Total de Preguntas Evaluadas:', 20, yPos)
      doc.text(total.toString(), 80, yPos)
      yPos += 6
      
      doc.text('Preguntas Cumplidas:', 20, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 128, 0) // Verde
      doc.text(passed.toString(), 75, yPos)
      doc.setTextColor(0, 0, 0) // Negro
      yPos += 6
      
      doc.setFont('helvetica', 'normal')
      doc.text('Preguntas No Cumplidas:', 20, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(200, 0, 0) // Rojo
      doc.text((total - passed).toString(), 80, yPos)
      doc.setTextColor(0, 0, 0) // Negro
      yPos += 12
      
      // Línea separadora
      doc.line(20, yPos, 190, yPos)
      yPos += 10
      
      // Evaluación
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('EVALUACIÓN GENERAL', 20, yPos)
      yPos += 8
      
      doc.setFontSize(14)
      // Color según evaluación
      if (selectedAudit.percentage >= 80) {
        doc.setTextColor(0, 150, 0) // Verde oscuro
      } else if (selectedAudit.percentage >= 60) {
        doc.setTextColor(0, 100, 200) // Azul
      } else if (selectedAudit.percentage >= 40) {
        doc.setTextColor(255, 140, 0) // Naranja
      } else {
        doc.setTextColor(200, 0, 0) // Rojo
      }
      
      doc.text(evaluation, 105, yPos, { align: 'center' })
      doc.setTextColor(0, 0, 0) // Volver a negro
      yPos += 15
      
      // Análisis descriptivo
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('ANÁLISIS DE RESULTADOS', 20, yPos)
      yPos += 8
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      
      // Generar análisis dinámico basado en los resultados
      const analysisText = generateDynamicAnalysis(selectedAudit, passed, total, evaluation)
      
      // Dividir el texto en líneas que quepan en el ancho de la página
      const maxWidth = 170
      const splitText = doc.splitTextToSize(analysisText, maxWidth)
      
      doc.text(splitText, 20, yPos, { align: 'justify' })
      yPos += splitText.length * 5 + 10
      
      // Revisar si necesitamos una nueva página
      if (yPos > 260) {
        doc.addPage()
        yPos = 20
      }
      
      // Firma
      yPos += 10
      doc.line(20, yPos, 190, yPos)
      yPos += 10
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('Generado el ' + new Date().toLocaleString('es-ES'), 20, yPos)
      doc.text('Sistema de Auditoría Informática', 170, yPos, { align: 'right' })
      
      // Guardar PDF
      doc.save(`resumen_ejecutivo_${selectedAudit.code}_${Date.now()}.pdf`)
    })
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Resumen Ejecutivo</h2>
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Volver
          </button>
        </div>
        <div className="space-y-4">
          {/* Filtro por área */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Filtrar por Área (Opcional)</label>
            <select
              value={selectedAreaFilter || ''}
              onChange={(e) => setSelectedAreaFilter(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border rounded bg-gray-700 text-white border-gray-600"
            >
              <option value="">Todas las áreas</option>
              {areas.map((area: any) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
            {selectedAreaFilter && (
              <p className="text-sm text-green-400 mt-1">
                Mostrando {filteredAudits.length} auditoría(s) de {areas.find((a: any) => a.id === selectedAreaFilter)?.name}
              </p>
            )}
          </div>
          
          <p className="text-gray-300">Seleccione una auditoría para generar un reporte PDF ejecutivo con análisis de resultados</p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {sortedAudits.map((audit: any) => (
              <div
                key={audit.id}
                onClick={() => setSelectedAudit(audit)}
                className={`p-3 border rounded cursor-pointer transition ${
                  selectedAudit?.id === audit.id
                    ? 'bg-blue-600 border-blue-500'
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-white font-medium">{audit.areaName}</span>
                  <span className="text-gray-300 text-sm">{audit.percentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>{audit.code}</span>
                  <span>{new Date(audit.date).toLocaleString('es-ES', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={generatePDF}
            disabled={!selectedAudit}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Generar PDF Ejecutivo
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailedSummary({ audits, onBack }: any) {
  const [selectedAudit, setSelectedAudit] = useState<any>(null)
  
  const exportToExcel = () => {
    if (!selectedAudit) {
      alert('Por favor seleccione una auditoría')
      return
    }

    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new()
      
      const data = []
      
      // Encabezado
      data.push(['REPORTE DETALLADO DE AUDITORÍA INFORMÁTICA'])
      data.push([])
      data.push(['='.repeat(100)])
      
      // Información general
      data.push(['INFORMACIÓN GENERAL'])
      data.push(['Fecha de Auditoría:', new Date(selectedAudit.date).toLocaleDateString()])
      data.push(['Fecha y Hora:', new Date(selectedAudit.date).toLocaleString('es-ES')])
      data.push(['Área Auditada:', selectedAudit.areaName])
      data.push(['Código de Auditoría:', selectedAudit.code])
      data.push(['Porcentaje de Cumplimiento:', `${selectedAudit.percentage.toFixed(1)}%`])
      data.push([])
      data.push(['='.repeat(100)])
      
      // Tabla de preguntas
      data.push(['RESULTADOS POR PREGUNTA'])
      data.push(['#', 'PREGUNTA EVALUADA', 'ESTADO', 'OBSERVACIONES'])
      
      selectedAudit.questions.forEach((q: any, index: number) => {
        const answerData = selectedAudit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        const status = answerValue ? 'Cumple' : 'No Cumple'
        const observation = typeof answerData === 'object' ? (answerData?.observation || '') : (answerValue ? 'Cumple con el requisito' : 'Requiere atención')
        data.push([
          index + 1,
          q.text,
          status,
          observation
        ])
      })
      
      data.push([])
      data.push(['='.repeat(100)])
      data.push(['RESUMEN FINAL'])
      data.push(['='.repeat(100)])
      const passed = selectedAudit.questions.filter((q: any) => {
        const answerData = selectedAudit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        return answerValue
      }).length
      const total = selectedAudit.questions.length
      data.push([])
      data.push(['Total de Preguntas Evaluadas:', total])
      data.push(['Respuestas Positivas (Cumplidas):', passed])
      data.push(['Respuestas Negativas (No Cumplidas):', total - passed])
      data.push(['Porcentaje de Cumplimiento:', `${selectedAudit.percentage.toFixed(1)}%`])
      const evaluation = selectedAudit.percentage >= 80 ? 'EXCELENTE' : 
                        selectedAudit.percentage >= 60 ? 'BUENO' :
                        selectedAudit.percentage >= 40 ? 'REGULAR' : 'REQUIERE MEJORA'
      data.push(['Evaluación General:', evaluation])
      data.push(['='.repeat(100)])
      
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws['!cols'] = [
        { wch: 5 },   // #
        { wch: 80 },  // Pregunta
        { wch: 15 },  // Estado
        { wch: 30 }   // Observaciones
      ]
      
      XLSX.utils.book_append_sheet(wb, ws, 'Resumen Detallado')
      XLSX.writeFile(wb, `resumen_detallado_${selectedAudit.code}.xlsx`)
    })
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Resumen Detallado</h2>
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Volver
          </button>
        </div>
        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto space-y-2">
            {audits.map((audit: any) => (
              <div
                key={audit.id}
                onClick={() => setSelectedAudit(audit)}
                className={`p-3 border rounded cursor-pointer transition ${
                  selectedAudit?.id === audit.id
                    ? 'bg-purple-600 border-purple-500'
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-white font-medium">{audit.areaName}</span>
                  <span className="text-gray-300 text-sm">{audit.percentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>{audit.code}</span>
                  <span>{new Date(audit.date).toLocaleString('es-ES', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={exportToExcel}
            disabled={!selectedAudit}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Exportar a Excel
          </button>
        </div>
      </div>
    </div>
  )
}

function CompleteAudit({ audits, onBack }: any) {
  const [selectedAudit, setSelectedAudit] = useState<any>(null)
  
  const exportToExcel = () => {
    if (!selectedAudit) {
      alert('Por favor seleccione una auditoría')
      return
    }

    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new()
      
      // 1. Resumen Ejecutivo
      const executiveData = []
      executiveData.push(['RESUMEN EJECUTIVO - AUDITORÍA INFORMÁTICA'])
      executiveData.push([])
      executiveData.push(['Información de la Auditoría'])
      executiveData.push(['Fecha de Realización:', new Date(selectedAudit.date).toLocaleDateString()])
      executiveData.push(['Área Auditada:', selectedAudit.areaName])
      executiveData.push(['Código de Auditoría:', selectedAudit.code])
      executiveData.push([])
      executiveData.push(['Resultados'])
      executiveData.push(['Porcentaje de Cumplimiento:', `${selectedAudit.percentage.toFixed(1)}%`])
      const passed = selectedAudit.questions.filter((q: any) => {
        const answerData = selectedAudit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        return answerValue
      }).length
      const total = selectedAudit.questions.length
      executiveData.push(['Preguntas Evaluadas:', total])
      executiveData.push(['Preguntas Cumplidas:', passed])
      executiveData.push(['Preguntas No Cumplidas:', total - passed])
      executiveData.push([])
      const evaluation = selectedAudit.percentage >= 80 ? 'Excelente' : 
                        selectedAudit.percentage >= 60 ? 'Bueno' :
                        selectedAudit.percentage >= 40 ? 'Regular' : 'Requiere Mejora'
      executiveData.push(['Evaluación General:', evaluation])
      const executiveWs = XLSX.utils.aoa_to_sheet(executiveData)
      executiveWs['!cols'] = [{ wch: 30 }, { wch: 30 }]
      XLSX.utils.book_append_sheet(wb, executiveWs, 'Resumen Ejecutivo')
      
      // 2. Resumen Detallado
      const detailedData = []
      detailedData.push(['REPORTE DETALLADO DE AUDITORÍA INFORMÁTICA'])
      detailedData.push([])
      detailedData.push(['Información General'])
      detailedData.push(['Fecha de Auditoría:', new Date(selectedAudit.date).toLocaleDateString()])
      detailedData.push(['Área Auditada:', selectedAudit.areaName])
      detailedData.push(['Código de Auditoría:', selectedAudit.code])
      detailedData.push(['Porcentaje de Cumplimiento:', `${selectedAudit.percentage.toFixed(1)}%`])
      detailedData.push([])
      detailedData.push(['RESULTADOS POR PREGUNTA'])
      detailedData.push(['#', 'Pregunta Evaluada', 'Respuesta', 'Estado', 'Observaciones'])
      selectedAudit.questions.forEach((q: any, index: number) => {
        const answer = selectedAudit.answers[q.id]
        const status = answer ? 'Cumple' : 'No Cumple'
        const observation = answer ? 'Cumple con el requisito' : 'Requiere atención'
        detailedData.push([
          index + 1,
          q.text,
          answer ? 'SÍ' : 'NO',
          status,
          observation
        ])
      })
      detailedData.push([])
      detailedData.push(['='.repeat(100)])
      detailedData.push(['RESUMEN FINAL'])
      detailedData.push(['='.repeat(100)])
      detailedData.push([])
      detailedData.push(['Total de Preguntas Evaluadas:', total])
      detailedData.push(['Respuestas Positivas (Cumplidas):', passed])
      detailedData.push(['Respuestas Negativas (No Cumplidas):', total - passed])
      detailedData.push(['Porcentaje de Cumplimiento:', `${selectedAudit.percentage.toFixed(1)}%`])
      detailedData.push(['Evaluación General:', evaluation])
      detailedData.push(['='.repeat(100)])
      const detailedWs = XLSX.utils.aoa_to_sheet(detailedData)
      detailedWs['!cols'] = [{ wch: 5 }, { wch: 70 }, { wch: 12 }, { wch: 15 }, { wch: 30 }]
      XLSX.utils.book_append_sheet(wb, detailedWs, 'Resumen Detallado')
      
      // 3. Auditoría Completa
      const completeData = []
      completeData.push(['AUDITORÍA INFORMÁTICA COMPLETA'])
      completeData.push([])
      completeData.push(['='.repeat(110)])
      completeData.push(['INFORMACIÓN GENERAL'])
      completeData.push(['Fecha de Auditoría:', new Date(selectedAudit.date).toLocaleDateString()])
      completeData.push(['Fecha y Hora:', new Date(selectedAudit.date).toLocaleString('es-ES')])
      completeData.push(['Área Auditada:', selectedAudit.areaName])
      completeData.push(['Código de Auditoría:', selectedAudit.code])
      completeData.push([])
      completeData.push(['='.repeat(110)])
      completeData.push(['ANÁLISIS COMPLETO POR PREGUNTA'])
      completeData.push(['#', 'PREGUNTA', 'SEVERIDAD', 'ESTADO', 'PESO RELATIVO', 'OBSERVACIONES'])
      let totalWeight = selectedAudit.questions.reduce((sum: number, q: any) => sum + q.severity, 0)
      selectedAudit.questions.forEach((q: any, index: number) => {
        const answerData = selectedAudit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        const observation = typeof answerData === 'object' ? (answerData?.observation || '') : ''
        const status = answerValue ? 'Cumple' : 'No Cumple'
        const weightPercent = ((q.severity / totalWeight) * 100).toFixed(1)
        completeData.push([
          index + 1,
          q.text,
          q.severity,
          status,
          `${weightPercent}%`,
          observation
        ])
      })
      completeData.push([])
      completeData.push(['='.repeat(110)])
      completeData.push(['RESUMEN DEL CUMPLIMIENTO'])
      completeData.push(['='.repeat(110)])
      completeData.push([])
      completeData.push(['Porcentaje de Cumplimiento:', `${selectedAudit.percentage.toFixed(1)}%`])
      completeData.push(['Preguntas Cumplidas:', `${passed} de ${total}`])
      completeData.push(['Preguntas No Cumplidas:', `${total - passed} de ${total}`])
      completeData.push(['Evaluación General:', evaluation])
      completeData.push(['='.repeat(110)])
      const completeWs = XLSX.utils.aoa_to_sheet(completeData)
      completeWs['!cols'] = [{ wch: 5 }, { wch: 65 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 40 }]
      XLSX.utils.book_append_sheet(wb, completeWs, 'Auditoría Completa')
      
      XLSX.writeFile(wb, `auditoria_completa_${selectedAudit.code}.xlsx`)
    })
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Auditoría Completa</h2>
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Volver
          </button>
        </div>
        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto space-y-2">
            {audits.map((audit: any) => (
              <div
                key={audit.id}
                onClick={() => setSelectedAudit(audit)}
                className={`p-3 border rounded cursor-pointer transition ${
                  selectedAudit?.id === audit.id
                    ? 'bg-orange-600 border-orange-500'
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-white font-medium">{audit.areaName}</span>
                  <span className="text-gray-300 text-sm">{audit.percentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>{audit.code}</span>
                  <span>{new Date(audit.date).toLocaleString('es-ES', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-blue-900 border border-blue-700 rounded p-3">
            <p className="text-white text-sm">Este reporte incluye los 3 reportes anteriores en un solo archivo Excel con múltiples hojas.</p>
          </div>
        <button
          onClick={exportToExcel}
            disabled={!selectedAudit}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Exportar a Excel
          </button>
        </div>
      </div>
    </div>
  )
}

function QuestionViewer({ questions, onUpdateQuestion, onDeleteQuestion }: { 
  questions: any[] 
  onUpdateQuestion: (id: number, data: { text?: string; severity?: number; code?: string }) => void
  onDeleteQuestion: (id: number) => void
}) {
  const [selectedCode, setSelectedCode] = useState('')
  const [showCodeDropdown, setShowCodeDropdown] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<any>(null)
  
  // Obtener códigos únicos
  const uniqueCodes = Array.from(new Set(questions.map(q => q.code).filter((code: string) => code && code !== 'DEFAULT')))
    .map(code => ({
      code,
      count: questions.filter(q => q.code === code).length
    }))
  
  // Filtrar preguntas según el código seleccionado
  const filteredQuestions = selectedCode 
    ? questions.filter(q => q.code === selectedCode)
    : questions
  
  return (
    <div className="mt-6">
      <h3 className="font-bold mb-3 text-white">Preguntas Existentes ({questions.length})</h3>
      
      {/* Dropdown para filtrar por código */}
      <div className="relative mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-300">Filtrar por Código</label>
        <div className="relative">
          <input
            type="text"
            value={selectedCode}
            onChange={(e) => {
              setSelectedCode(e.target.value)
              setShowCodeDropdown(true)
            }}
            onFocus={() => setShowCodeDropdown(true)}
            placeholder="Seleccionar código..."
            className="w-full px-4 py-2 border rounded bg-gray-800 text-white border-gray-600 placeholder-gray-400"
          />
          {showCodeDropdown && uniqueCodes.length > 0 && (
            <>
              <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded max-h-48 overflow-y-auto">
                <div
                  onClick={() => {
                    setSelectedCode('')
                    setShowCodeDropdown(false)
                  }}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-600 text-white text-sm"
                >
                  Todos los códigos ({questions.length})
                </div>
                {uniqueCodes.map((item: any) => (
                  <div
                    key={item.code}
                    onClick={() => {
                      setSelectedCode(item.code)
                      setShowCodeDropdown(false)
                    }}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-600 text-white text-sm flex justify-between items-center"
                  >
                    <span>{item.code}</span>
                    <span className="text-gray-400 text-xs">{item.count} pregunta{item.count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
              <div 
                className="fixed inset-0 z-0" 
                onClick={() => setShowCodeDropdown(false)}
              ></div>
            </>
          )}
        </div>
      </div>
      
      {/* Lista de preguntas con opciones de edición */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredQuestions.map((q: any) => (
          <div key={q.id} className="p-4 border rounded bg-gray-700 border-gray-600">
            {editingQuestion?.id === q.id ? (
              <EditQuestionForm
                question={q}
                uniqueCodes={uniqueCodes}
                onSave={(data) => {
                  onUpdateQuestion(q.id, data)
                  setEditingQuestion(null)
                }}
                onCancel={() => setEditingQuestion(null)}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-white text-sm">[{q.code}]</span>
                      <span className="text-gray-400 text-xs">Severidad: {q.severity}</span>
                    </div>
                    <p className="text-gray-300">{q.text}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDeleteQuestion(q.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filteredQuestions.length === 0 && (
          <p className="text-gray-400 text-center py-4">No hay preguntas para mostrar</p>
        )}
      </div>
    </div>
  )
}

function EditQuestionForm({ 
  question, 
  uniqueCodes,
  onSave, 
  onCancel 
}: { 
  question: any
  uniqueCodes: any[]
  onSave: (data: { text?: string; severity?: number; code?: string }) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(question.text)
  const [severity, setSeverity] = useState(question.severity)
  const [code, setCode] = useState(question.code)
  const [showCodeDropdown, setShowCodeDropdown] = useState(false)
  
  const handleSave = () => {
    if (!text.trim() || !code.trim()) return
    onSave({ text: text.trim(), severity, code })
  }
  
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-300 mb-1">Texto de la pregunta</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3 py-2 border rounded bg-gray-800 text-white border-gray-600"
          rows={2}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-300 mb-1">Código</label>
          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setShowCodeDropdown(true)
              }}
              onFocus={() => setShowCodeDropdown(true)}
              className="w-full px-3 py-2 border rounded bg-gray-800 text-white border-gray-600 text-sm"
            />
            {showCodeDropdown && uniqueCodes.length > 0 && (
              <>
                <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded max-h-32 overflow-y-auto">
                  {uniqueCodes.filter(item => item.code.toLowerCase().includes(code.toLowerCase())).map((item: any) => (
                    <div
                      key={item.code}
                      onClick={() => {
                        setCode(item.code)
                        setShowCodeDropdown(false)
                      }}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-600 text-white text-xs"
                    >
                      {item.code}
                    </div>
                  ))}
                </div>
                <div 
                  className="fixed inset-0 z-0" 
                  onClick={() => setShowCodeDropdown(false)}
                ></div>
              </>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-xs text-gray-300 mb-1">Severidad (1-10)</label>
          <input
            type="number"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            min="1"
            max="10"
            className="w-full px-3 py-2 border rounded bg-gray-800 text-white border-gray-600 text-sm"
          />
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
        >
          Guardar
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
