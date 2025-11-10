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
    
    if (!questionCode.trim()) {
      alert('Por favor ingrese un código para las preguntas antes de cargar el archivo')
      e.target.value = ''
      return
    }
    
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      alert('El archivo está vacío o no contiene preguntas válidas')
      e.target.value = ''
      return
    }
    
    const newQuestions: Question[] = []
    lines.forEach((line, index) => {
      // Obtener el ID máximo actual para evitar duplicados
      const maxId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) : 0
      const newId = maxId + index + 1
      
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
      
      if (questionText) {
        newQuestions.push({
          id: newId,
          text: questionText,
          severity: questionSeverity,
          code: questionCode || 'DEFAULT'
        })
      }
    })
    
    if (newQuestions.length === 0) {
      alert('No se pudieron procesar las preguntas del archivo. Verifique el formato.')
      e.target.value = ''
      return
    }
    
    const updated = [...questions, ...newQuestions]
    setQuestions(updated)
    sessionStorage.setItem('questions', JSON.stringify(updated))
    setQuestionCode('')
    e.target.value = ''
    alert(`Se agregaron ${newQuestions.length} pregunta(s) exitosamente`)
  }

  const downloadTemplate = () => {
    const templateContent = `¿El sistema tiene copias de seguridad actualizadas?|8
¿Existe un plan de recuperación ante desastres?|10
¿Los accesos al sistema están debidamente controlados?|9
¿Se realizan auditorías de seguridad periódicas?|7
¿El personal tiene capacitación en seguridad informática?|6
¿Los equipos tienen antivirus actualizado?|5
¿Existe control de acceso físico a los servidores?|9
¿Se realiza backup de la base de datos regularmente?|8
¿Los permisos de acceso están correctamente asignados?|8
¿Se documentan los incidentes de seguridad?|6
¿Existe un firewall configurado?|7
¿Los sistemas operativos están actualizados con los últimos parches de seguridad?|8
`
    
    const blob = new Blob([templateContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plantilla_preguntas.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
    <div className="min-h-screen bg-elegant-gray">
      <header className="bg-corporate-blue text-pure-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Sistema de Auditoría</h1>
        <div className="flex items-center gap-4">
          <span className="text-pure-white opacity-90">Usuario: {username}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 text-pure-white transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {activeModule === 'dashboard' && (
        <div className="container mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6 text-dark-gray">Módulos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button
              onClick={() => setActiveModule('areas')}
              className="bg-pure-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-left hover:bg-opacity-95 border border-elegant-gray"
            >
              <h3 className="text-xl font-bold mb-2 text-dark-gray">Gestionar Áreas</h3>
              <p className="text-dark-gray opacity-70">Agregar y visualizar áreas</p>
            </button>
            <button
              onClick={() => setActiveModule('questions')}
              className="bg-pure-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-left hover:bg-opacity-95 border border-elegant-gray"
            >
              <h3 className="text-xl font-bold mb-2 text-dark-gray">Agregar Preguntas</h3>
              <p className="text-dark-gray opacity-70">Cargar preguntas manualmente o por archivo</p>
            </button>
            <button
              onClick={() => setActiveModule('create-audit')}
              className="bg-pure-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-left hover:bg-opacity-95 border border-elegant-gray"
            >
              <h3 className="text-xl font-bold mb-2 text-dark-gray">Realizar Auditoría</h3>
              <p className="text-dark-gray opacity-70">Crear y completar auditorías</p>
            </button>
            <button
              onClick={() => setActiveModule('summary')}
              className="bg-pure-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-left hover:bg-opacity-95 border border-elegant-gray"
            >
              <h3 className="text-xl font-bold mb-2 text-dark-gray">Resumen</h3>
              <p className="text-dark-gray opacity-70">Ver resumen de auditorías</p>
            </button>
            <button
              onClick={() => setActiveModule('reports')}
              className="bg-pure-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-left hover:bg-opacity-95 border border-elegant-gray"
            >
              <h3 className="text-xl font-bold mb-2 text-dark-gray">Reportes</h3>
              <p className="text-dark-gray opacity-70">Generar diferentes tipos de reportes</p>
            </button>
          </div>
        </div>
      )}

      {activeModule === 'areas' && (
        <div className="container mx-auto p-6">
          <div className="bg-pure-white p-6 rounded-lg shadow-md border border-elegant-gray">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-dark-gray">Gestión de Áreas</h2>
              <button
                onClick={() => setActiveModule('dashboard')}
                className="bg-dark-gray text-pure-white px-4 py-2 rounded hover:bg-opacity-90 transition"
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
                className="flex-1 px-4 py-2 border border-light-blue rounded bg-elegant-gray text-dark-gray placeholder-dark-gray placeholder-opacity-50 focus:outline-none focus:ring-2 focus:ring-light-blue"
              />
              <button
                onClick={handleAddArea}
                className="bg-light-blue text-pure-white px-6 py-2 rounded hover:bg-opacity-90 transition"
              >
                Agregar
              </button>
            </div>
            <div className="space-y-2">
              {areas.map(area => (
                <div key={area.id} className="p-3 border border-elegant-gray rounded flex justify-between items-center bg-pure-white hover:bg-elegant-gray transition">
                  <span className="text-dark-gray">{area.name}</span>
                  <span className="text-dark-gray opacity-70">ID: {area.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeModule === 'questions' && (
        <div className="container mx-auto p-6">
          <div className="bg-pure-white p-6 rounded-lg shadow-md border border-elegant-gray">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-dark-gray">Agregar Preguntas</h2>
              <button
                onClick={() => setActiveModule('dashboard')}
                className="bg-dark-gray text-pure-white px-4 py-2 rounded hover:bg-opacity-90 transition"
              >
                Volver
              </button>
            </div>
            <div className="border border-elegant-gray p-6 rounded bg-elegant-gray">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-dark-gray">Cargar preguntas desde archivo .txt</h3>
                <button
                  onClick={downloadTemplate}
                  className="bg-light-blue text-pure-white px-4 py-2 rounded hover:bg-opacity-90 transition text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar Plantilla
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-dark-gray">
                    Código para las preguntas <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={questionCode}
                    onChange={(e) => setQuestionCode(e.target.value)}
                    placeholder="Ingrese el código para las preguntas (ej: ISO27001, NIST, PCI-DSS, etc.)"
                    className="w-full px-4 py-2 border border-light-blue rounded bg-pure-white text-dark-gray placeholder-dark-gray placeholder-opacity-50 focus:outline-none focus:ring-2 focus:ring-light-blue"
                  />
                  <p className="text-xs text-dark-gray opacity-70 mt-1">
                    Este código identificará el grupo de preguntas que está cargando
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-dark-gray">
                    Seleccionar archivo .txt <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="w-full px-4 py-2 border border-light-blue rounded bg-pure-white text-dark-gray focus:outline-none focus:ring-2 focus:ring-light-blue cursor-pointer"
                  />
                </div>
                
                <div className="bg-corporate-blue bg-opacity-5 border-l-4 border-light-blue rounded p-4">
                  <h4 className="font-semibold text-dark-gray mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-light-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Formato del archivo
                  </h4>
                  <div className="space-y-2 text-sm text-dark-gray">
                    <p>
                      <strong>Formato básico:</strong> Cada línea del archivo representa una pregunta.
                    </p>
                    <div className="bg-pure-white rounded p-3 border border-elegant-gray">
                      <code className="text-xs text-dark-gray block whitespace-pre-line">
{`¿Existe un plan de recuperación ante desastres?
¿Los accesos al sistema están debidamente controlados?
¿Se realizan auditorías de seguridad periódicas?`}
                      </code>
                    </div>
                    <p className="mt-3">
                      <strong>Formato con severidad:</strong> Para especificar la severidad de cada pregunta (1-10), 
                      separe la pregunta y el número con el símbolo <code className="bg-pure-white px-1 rounded border">|</code> (pipe).
                    </p>
                    <div className="bg-pure-white rounded p-3 border border-elegant-gray">
                      <code className="text-xs text-dark-gray block whitespace-pre-line">
{`¿El sistema tiene copias de seguridad actualizadas?|8
¿Existe un plan de recuperación ante desastres?|10
¿Los equipos tienen antivirus actualizado?|5`}
                      </code>
                    </div>
                    <div className="mt-3 pt-3 border-t border-elegant-gray">
                      <p className="font-semibold mb-1">Notas importantes:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                        <li>Si no se especifica severidad, se asignará automáticamente 1 (mínima)</li>
                        <li>La severidad debe estar entre 1 y 10</li>
                        <li>Las líneas vacías serán ignoradas</li>
                        <li>El archivo debe tener extensión .txt</li>
                        <li>El código de preguntas es obligatorio antes de cargar el archivo</li>
                      </ul>
                    </div>
                  </div>
                </div>
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
          <div className="bg-pure-white p-6 rounded-lg shadow-md border border-elegant-gray">
            <p className="text-dark-gray mb-4">Error: No se pudo cargar la auditoría</p>
            <button
              onClick={() => setActiveModule('dashboard')}
              className="bg-dark-gray text-pure-white px-4 py-2 rounded hover:bg-opacity-90 transition"
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
          areas={areas}
          onBack={() => setActiveModule('reports')}
        />
      )}

      {activeModule === 'report-complete-audit' && (
        <CompleteAudit
          audits={audits}
          areas={areas}
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
      <div className="bg-pure-white p-6 rounded-lg shadow-md border border-elegant-gray">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-dark-gray">Crear Auditoría</h2>
          <button
            onClick={onBack}
            className="bg-dark-gray text-pure-white px-4 py-2 rounded hover:bg-opacity-90 transition"
          >
            Volver
          </button>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <label className="block font-semibold mb-2 text-dark-gray">Seleccionar Área</label>
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
                className="w-full px-4 py-2 border border-light-blue rounded bg-elegant-gray text-dark-gray placeholder-dark-gray placeholder-opacity-50 focus:outline-none focus:ring-2 focus:ring-light-blue"
              />
              {showAreaDropdown && (
                <>
                  <div className="absolute z-10 w-full mt-1 bg-pure-white border border-elegant-gray rounded max-h-48 overflow-y-auto shadow-lg">
                    {filteredAreas.length > 0 ? (
                      filteredAreas.map((area: any) => (
                        <div
                          key={area.id}
                          onClick={() => {
                            setSelectedArea(area.id)
                            setSearchArea(area.name)
                            setShowAreaDropdown(false)
                          }}
                          className="px-4 py-2 cursor-pointer hover:bg-light-blue hover:text-pure-white text-dark-gray text-sm transition"
                        >
                          {area.name} <span className="opacity-70">(ID: {area.id})</span>
          </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-dark-gray opacity-70 text-sm">No se encontraron áreas</div>
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
              <p className="text-sm text-institutional-green mt-1">Área seleccionada: {areas.find((a: any) => a.id === selectedArea)?.name}</p>
            )}
          </div>

          <div className="relative">
            <label className="block font-semibold mb-2 text-dark-gray">Código de Preguntas</label>
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
              className="w-full px-4 py-2 border border-light-blue rounded bg-elegant-gray text-dark-gray placeholder-dark-gray placeholder-opacity-50 focus:outline-none focus:ring-2 focus:ring-light-blue"
            />
              {showCodeDropdown && uniqueCodes.length > 0 && (
                <>
                  <div className="absolute z-10 w-full mt-1 bg-pure-white border border-elegant-gray rounded max-h-48 overflow-y-auto shadow-lg">
                    {filteredCodes.length > 0 ? (
                      filteredCodes.map((item: any) => (
                        <div
                          key={item.code}
                          onClick={() => {
                            setAuditCode(item.code)
                            setSearchCode(item.code)
                            setShowCodeDropdown(false)
                          }}
                          className="px-4 py-2 cursor-pointer hover:bg-light-blue hover:text-pure-white text-dark-gray text-sm flex justify-between items-center transition"
                        >
                          <span>{item.code}</span>
                          <span className="opacity-70 text-xs">{item.count} pregunta{item.count !== 1 ? 's' : ''}</span>
          </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-dark-gray opacity-70 text-sm">No se encontraron códigos</div>
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
              <p className="text-sm text-institutional-green mt-1">Código: {auditCode}</p>
            )}
          </div>

          <button
            onClick={onStart}
            disabled={!selectedArea || !auditCode}
            className="bg-institutional-green text-pure-white px-6 py-2 rounded hover:bg-opacity-90 disabled:bg-elegant-gray disabled:text-dark-gray disabled:cursor-not-allowed transition"
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
      <div className="bg-pure-white p-6 rounded-lg shadow-md border border-elegant-gray">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-dark-gray">Auditoría - {audit.areaName}</h2>
          <button
            onClick={onBack}
            className="bg-dark-gray text-pure-white px-4 py-2 rounded hover:bg-opacity-90 transition"
          >
            Cancelar
          </button>
        </div>
        <div className="mb-4">
          <div className="bg-elegant-gray rounded h-4">
            <div 
              className="bg-light-blue h-4 rounded transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-dark-gray opacity-70 mt-2">
            Pregunta {currentIndex + 1} de {questions.length}
          </p>
        </div>
        {currentQuestion && (
          <div className="space-y-4">
            <div className="p-4 bg-elegant-gray rounded border border-elegant-gray">
              <p className="text-xl text-dark-gray">{currentQuestion.text}</p>
            </div>
            
            {/* Campo de observación */}
            <div>
              <label className="block text-sm font-medium mb-2 text-dark-gray">
                Observaciones (opcional)
              </label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Agregar una observación o comentario sobre esta pregunta..."
                className="w-full px-4 py-2 border border-light-blue rounded bg-pure-white text-dark-gray placeholder-dark-gray placeholder-opacity-50 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-light-blue"
              />
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => handleAnswer(true)}
                className="flex-1 bg-institutional-green text-pure-white py-4 rounded hover:bg-opacity-90 text-lg font-semibold transition"
              >
                SÍ
              </button>
              <button
                onClick={() => handleAnswer(false)}
                className="flex-1 bg-red-600 text-pure-white py-4 rounded hover:bg-red-700 text-lg font-semibold transition"
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
      <div className="bg-pure-white p-6 rounded-lg shadow-md border border-elegant-gray">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-dark-gray">Resumen de Auditorías</h2>
          <button
            onClick={onBack}
            className="bg-dark-gray text-pure-white px-4 py-2 rounded hover:bg-opacity-90 transition"
          >
            Volver
          </button>
        </div>
        {audits.length === 0 ? (
          <p className="text-dark-gray opacity-70">No hay auditorías registradas</p>
        ) : (
          <div className="space-y-4">
            {audits.map((audit: any) => (
              <div key={audit.id} className="border border-elegant-gray rounded p-4 bg-pure-white hover:bg-elegant-gray transition">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-dark-gray">{audit.areaName}</h3>
                    <p className="text-sm text-dark-gray opacity-70">Código: {audit.code}</p>
                    <p className="text-sm text-dark-gray opacity-70">
                      Fecha: {new Date(audit.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-dark-gray">{audit.percentage.toFixed(1)}%</p>
                    <p className="text-sm text-dark-gray opacity-70">Cumplimiento</p>
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
                          <span className={`w-3 h-3 rounded-full ${answerValue ? 'bg-institutional-green' : 'bg-red-500'}`}></span>
                      <span className="text-dark-gray">{q.text}</span>
                    </div>
                        {observation && (
                          <div className="ml-5 text-xs text-dark-gray opacity-70 italic">
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
      <div className="bg-pure-white p-6 rounded-lg shadow-md border border-elegant-gray">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-dark-gray">Reportes</h2>
          <button
            onClick={onBack}
            className="bg-dark-gray text-pure-white px-4 py-2 rounded hover:bg-opacity-90 transition"
          >
            Volver
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onSelect('report-excel-questions')}
            className="bg-light-blue p-6 rounded-lg hover:bg-opacity-90 text-left transition border border-light-blue shadow-md"
          >
            <h3 className="text-xl font-bold mb-2 text-pure-white">Exportar Respuestas por Área</h3>
            <p className="text-pure-white opacity-90">Exportar respuestas filtradas por área</p>
          </button>
          <button
            onClick={() => onSelect('report-executive-summary')}
            className="bg-institutional-green p-6 rounded-lg hover:bg-opacity-90 text-left transition border border-institutional-green shadow-md"
          >
            <h3 className="text-xl font-bold mb-2 text-pure-white">Resumen Ejecutivo</h3>
            <p className="text-pure-white opacity-90">Vista general de las auditorías</p>
          </button>
          <button
            onClick={() => onSelect('report-detailed-summary')}
            className="bg-corporate-blue p-6 rounded-lg hover:bg-opacity-90 text-left transition border border-corporate-blue shadow-md"
          >
            <h3 className="text-xl font-bold mb-2 text-pure-white">Resumen Detallado</h3>
            <p className="text-pure-white opacity-90">Análisis completo por preguntas</p>
          </button>
          <button
            onClick={() => onSelect('report-complete-audit')}
            className="bg-dark-gray p-6 rounded-lg hover:bg-opacity-90 text-left transition border border-dark-gray shadow-md"
          >
            <h3 className="text-xl font-bold mb-2 text-pure-white">Auditoría Completa</h3>
            <p className="text-pure-white opacity-90">Informe completo con todos los detalles</p>
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
      <div className="bg-pure-white p-6 rounded-lg shadow-md border border-elegant-gray">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-dark-gray">Exportar Respuestas por Área</h2>
          <button
            onClick={onBack}
            className="bg-dark-gray text-pure-white px-4 py-2 rounded hover:bg-opacity-90 transition"
          >
            Volver
          </button>
        </div>
        <div className="space-y-4">
          {/* Filtro por área */}
          <div>
            <label className="block text-sm font-medium mb-2 text-dark-gray">Filtrar por Área (Opcional)</label>
            <select
              value={selectedAreaFilter || ''}
              onChange={(e) => setSelectedAreaFilter(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-light-blue rounded bg-elegant-gray text-dark-gray focus:outline-none focus:ring-2 focus:ring-light-blue"
            >
              <option value="">Todas las áreas</option>
              {areas.map((area: any) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
            {selectedAreaFilter && (
              <p className="text-sm text-institutional-green mt-1">
                Mostrando {filteredAudits.length} auditoría(s) de {areas.find((a: any) => a.id === selectedAreaFilter)?.name}
              </p>
            )}
          </div>
          
          <p className="text-dark-gray opacity-70">Seleccione una auditoría para exportar las respuestas por área</p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {sortedAudits.map((audit: any) => (
              <div
                key={audit.id}
                onClick={() => setSelectedAudit(audit)}
                className={`p-3 border rounded cursor-pointer transition ${
                  selectedAudit?.id === audit.id
                    ? 'bg-light-blue border-light-blue text-pure-white'
                    : 'bg-pure-white border-elegant-gray hover:bg-elegant-gray text-dark-gray'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{audit.areaName}</span>
                  <span className="text-sm opacity-90">{audit.percentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm opacity-70 mt-1">
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
            className="bg-institutional-green text-pure-white px-6 py-2 rounded hover:bg-opacity-90 disabled:bg-elegant-gray disabled:text-dark-gray disabled:cursor-not-allowed transition"
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
  const riskLevel = percentage < 40 ? 'crítico' : percentage < 60 ? 'alto' : percentage < 80 ? 'moderado' : 'bajo'
  
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
  analysis += `la auditoría informática realizada al área de ${areaName.toLowerCase()} el ${new Date(audit.date).toLocaleDateString('es-ES')} presenta un nivel de cumplimiento ${evaluation.toLowerCase()}. `
  
  // Análisis de cumplimiento
  if (percentage >= 90) {
    analysis += `con un ${percentage.toFixed(1)} por ciento de cumplimiento, esta área demuestra un desempeño ejemplar en seguridad informática. `
  } else if (percentage >= 70) {
    analysis += `con un ${percentage.toFixed(1)} por ciento de cumplimiento, el área muestra un buen nivel de madurez en sus controles de seguridad. `
  } else if (percentage >= 50) {
    analysis += `con un ${percentage.toFixed(1)} por ciento de cumplimiento, existen oportunidades claras de mejora en los controles implementados. `
  } else {
    analysis += `con un ${percentage.toFixed(1)} por ciento de cumplimiento, se identifican deficiencias significativas que requieren atención inmediata. `
  }
  
  // Análisis cuantitativo
  const passRatePercent = (passRate * 100).toFixed(0)
  const failRatePercent = ((failedCount/total)*100).toFixed(0)
  analysis += `de un total de ${total} controles evaluados, ${passed} equivalente al ${passRatePercent} por ciento fueron implementados correctamente, mientras que ${failedCount} equivalente al ${failRatePercent} por ciento presentan deficiencias. `
  
  // Análisis de severidad e impacto
  if (failedQuestions.length > 0) {
    analysis += `el análisis de las áreas no cumplidas revela: `
    
    if (highSeverityFailed > 0) {
      const controlText = highSeverityFailed > 1 ? 'controles' : 'control'
      analysis += `${highSeverityFailed} ${controlText} de alta criticidad con severidad mayor o igual a ocho, lo que representa un riesgo significativo para la seguridad informática del área. `
    }
    
    if (mediumSeverityFailed > 0) {
      const controlText = mediumSeverityFailed > 1 ? 'controles' : 'control'
      analysis += `${mediumSeverityFailed} ${controlText} de severidad media entre cinco y siete que afectan la robustez de los controles. `
    }
    
    if (lowSeverityFailed > 0) {
      const controlText = lowSeverityFailed > 1 ? 'controles' : 'control'
      analysis += `${lowSeverityFailed} ${controlText} de menor criticidad, que aunque menos urgentes, contribuyen al nivel general de madurez. `
    }
    
    analysis += `considerando el peso relativo de los controles no cumplidos, el impacto real en la seguridad informática se estima en ${impactPercentage.toFixed(1)} por ciento del total del programa de seguridad. `
  }
  
  // Evaluación de riesgo
  analysis += `el nivel de riesgo general se clasifica como ${riskLevel}. `
  
  // Recomendaciones basadas en los resultados
  if (percentage >= 80) {
    analysis += `se recomienda mantener los altos estándares actuales, implementar mejoras continuas en las áreas identificadas, y considerar la adopción de mejores prácticas adicionales. la capacitación continua del personal y la revisión periódica de controles contribuirán a mantener este nivel de excelencia.`
  } else if (percentage >= 60) {
    analysis += `se recomienda desarrollar un plan de acción estructurado con priorización de las deficiencias de mayor severidad. la asignación de recursos específicos y la definición de responsables permitirán cerrar las brechas identificadas. es fundamental establecer revisiones periódicas para monitorear el progreso de las mejoras implementadas.`
  } else if (percentage >= 40) {
    analysis += `se recomienda urgentemente desarrollar e implementar un plan de acción inmediato y comprensivo. se deben asignar recursos prioritarios para abordar las deficiencias críticas y de alta severidad. la dirección del área debe involucrarse activamente para asegurar el cumplimiento de los plazos establecidos en el plan de remediación. la auditoría de seguimiento debe realizarse en un plazo no mayor a tres meses.`
  } else {
    analysis += `se requiere intervención inmediata por parte de la dirección ejecutiva y de seguridad informática. es imperativo asignar recursos especializados y establecer un programa de remediación agresivo con metas a corto, mediano y largo plazo. todas las deficiencias críticas deben ser abordadas en un plazo máximo de treinta días. se recomienda realizar una auditoría de seguimiento mensual hasta alcanzar al menos un sesenta por ciento de cumplimiento. la situación actual expone a la organización a riesgos operativos y regulatorios significativos.`
  }
  
  // Convertir todo a minúsculas
  return analysis.toLowerCase()
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
      const doc = new jsPDF('portrait', 'mm', 'a4') // Cambiar a vertical para mejor legibilidad
      
      // Colores corporativos (RGB)
      const corporateBlue = [10, 61, 98] // #0A3D62
      const lightBlue = [60, 141, 188] // #3C8DBC
      const institutionalGreen = [40, 167, 69] // #28A745
      const darkGray = [44, 62, 80] // #2C3E50
      const elegantGray = [229, 229, 229] // #E5E5E5
      
      // Cálculos
      const passed = selectedAudit.questions.filter((q: any) => {
        const answerData = selectedAudit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        return answerValue
      }).length
      const total = selectedAudit.questions.length
      const failed = total - passed
      const evaluation = selectedAudit.percentage >= 80 ? 'EXCELENTE' : 
                        selectedAudit.percentage >= 60 ? 'BUENO' :
                        selectedAudit.percentage >= 40 ? 'REGULAR' : 'REQUIERE MEJORA'
      
      // Función auxiliar para dibujar caja con fondo
      const drawBox = (x: number, y: number, width: number, height: number, color: number[], text: string, fontSize: number = 10, bold: boolean = false) => {
        doc.setFillColor(color[0], color[1], color[2])
        doc.roundedRect(x, y, width, height, 2, 2, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        const textWidth = doc.getTextWidth(text)
        doc.text(text, x + width / 2, y + height / 2 + 2, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }
      
      // Función auxiliar para dibujar barra de progreso
      const drawProgressBar = (x: number, y: number, width: number, height: number, percentage: number, color: number[]) => {
        // Fondo gris
        doc.setFillColor(elegantGray[0], elegantGray[1], elegantGray[2])
        doc.roundedRect(x, y, width, height, 1, 1, 'F')
        // Barra de progreso
        const progressWidth = (width * percentage) / 100
        doc.setFillColor(color[0], color[1], color[2])
        doc.roundedRect(x, y, progressWidth, height, 1, 1, 'F')
        // Borde
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.1)
        doc.roundedRect(x, y, width, height, 1, 1, 'S')
      }
      
      let yPos = 15
      const pageWidth = 210
      // Márgenes optimizados: margen derecho mínimo para usar máximo espacio
      // Márgenes de impresora suelen ser 5-10mm, así que 20mm izquierda es seguro
      const margin = 20 // Margen izquierdo
      const marginRight = 10 // Margen derecho mínimo (10mm para seguridad de impresión)
      const textMargin = 5 // Margen interno reducido
      const contentWidth = pageWidth - margin - marginRight // Ancho real del contenido: 180mm
      const maxTextWidth = contentWidth - (textMargin * 2) // 170mm de ancho máximo para el texto
      
      // ========== ENCABEZADO CON COLOR CORPORATIVO ==========
      doc.setFillColor(corporateBlue[0], corporateBlue[1], corporateBlue[2])
      doc.rect(0, 0, pageWidth, 35, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('REPORTE EJECUTIVO', pageWidth / 2, 18, { align: 'center' })
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('AUDITORÍA INFORMÁTICA', pageWidth / 2, 26, { align: 'center' })
      
      doc.setTextColor(0, 0, 0)
      yPos = 40
      
      // ========== INFORMACIÓN DE LA AUDITORÍA ==========
      doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
      doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      // Centrar el texto dentro del ancho disponible
      doc.text('INFORMACIÓN DE LA AUDITORÍA', margin + contentWidth / 2, yPos + 5.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 12
      
      // Tabla de información en dos columnas
      const infoData = [
        ['Fecha de Realización:', new Date(selectedAudit.date).toLocaleDateString('es-ES')],
        ['Fecha y Hora:', new Date(selectedAudit.date).toLocaleString('es-ES')],
        ['Área Auditada:', selectedAudit.areaName],
        ['Código de Auditoría:', selectedAudit.code]
      ]
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      infoData.forEach(([label, value], index) => {
        const rowY = yPos + (index * 7)
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin + textMargin, rowY)
        doc.setFont('helvetica', 'normal')
        // Ajustar posición para que el valor no se salga - usar un ancho máximo para el valor
        const maxLabelWidth = 65
        const valueX = margin + textMargin + maxLabelWidth
        // Si el valor es muy largo, dividirlo en líneas
        const valueLines = doc.splitTextToSize(value, contentWidth - maxLabelWidth - (textMargin * 2))
        doc.text(valueLines, valueX, rowY, { maxWidth: contentWidth - maxLabelWidth - (textMargin * 2) })
      })
      yPos += 32
      
      // ========== MÉTRICAS DESTACADAS ==========
      // Porcentaje de cumplimiento (caja grande)
      const percentageColor = selectedAudit.percentage >= 80 ? institutionalGreen :
                              selectedAudit.percentage >= 60 ? lightBlue :
                              selectedAudit.percentage >= 40 ? [255, 193, 7] : [220, 53, 69]
      
      drawBox(margin, yPos, contentWidth, 20, percentageColor, `${selectedAudit.percentage.toFixed(1)}%`, 24, true)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('PORCENTAJE DE CUMPLIMIENTO', pageWidth / 2, yPos + 16, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 25
      
      // Cajas de métricas en dos columnas
      const boxWidth = (contentWidth - 5) / 2
      
      // Preguntas cumplidas
      drawBox(margin, yPos, boxWidth, 15, institutionalGreen, `${passed}`, 16, true)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Preguntas Cumplidas', margin + boxWidth / 2, yPos + 11, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      
      // Preguntas no cumplidas
      drawBox(margin + boxWidth + 5, yPos, boxWidth, 15, [220, 53, 69], `${failed}`, 16, true)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Preguntas No Cumplidas', margin + boxWidth + 5 + boxWidth / 2, yPos + 11, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 20
      
      // Total de preguntas
      doc.setFillColor(elegantGray[0], elegantGray[1], elegantGray[2])
      doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F')
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total de Preguntas Evaluadas: ${total}`, pageWidth / 2, yPos + 7.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 18
      
      // ========== BARRA DE PROGRESO ==========
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      const progressBarStartX = margin + textMargin
      doc.text('Progreso de Cumplimiento', progressBarStartX, yPos)
      yPos += 6
      
      // La barra de progreso debe usar el mismo ancho que el texto para consistencia
      // Usar el mismo ancho que el texto del análisis (168mm)
      const progressBarWidth = maxTextWidth - 2 // 168mm - mismo ancho que usaremos para el texto
      const progressBarHeight = 8
      drawProgressBar(progressBarStartX, yPos, progressBarWidth, progressBarHeight, selectedAudit.percentage, percentageColor)
      
      // Texto del porcentaje sobre la barra
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      const percentageText = `${selectedAudit.percentage.toFixed(1)}%`
      const barStartX = progressBarStartX
      const textX = barStartX + (progressBarWidth * selectedAudit.percentage) / 100 - (doc.getTextWidth(percentageText) / 2)
      // Verificar que el texto no se salga de la barra ni del área permitida
      const maxBarEndX = barStartX + progressBarWidth
      if (textX > barStartX && textX + doc.getTextWidth(percentageText) < maxBarEndX) {
        doc.text(percentageText, textX, yPos + 5.5)
      } else {
        // Si no cabe, ponerlo después de la barra pero dentro de los márgenes
        doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
        const maxRightX = margin + contentWidth - doc.getTextWidth(percentageText) - 2
        const textAfterBarX = Math.min(barStartX + progressBarWidth + 3, maxRightX)
        doc.text(percentageText, textAfterBarX, yPos + 5.5)
      }
      doc.setTextColor(0, 0, 0)
      yPos += 15
      
      // ========== EVALUACIÓN GENERAL ==========
      doc.setFillColor(corporateBlue[0], corporateBlue[1], corporateBlue[2])
      doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`EVALUACIÓN: ${evaluation}`, pageWidth / 2, yPos + 6.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 16
      
      // ========== ANÁLISIS DE RESULTADOS ==========
      doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
      doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      // Centrar el texto dentro del ancho disponible
      doc.text('ANÁLISIS DE RESULTADOS', margin + contentWidth / 2, yPos + 5.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 12
      
      // Tamaño de fuente óptimo para legibilidad y espacio
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      
      // Generar análisis dinámico
      const analysisText = generateDynamicAnalysis(selectedAudit, passed, total, evaluation)
      
      // Calcular ancho del texto para el análisis justificado
      // MARGEN DERECHO REDUCIDO SOLO PARA ESTA SECCIÓN
      // Usar margen derecho mínimo (5mm) solo para el texto del análisis
      const analysisMarginRight = 5 // Margen derecho mínimo solo para análisis
      const analysisContentWidth = pageWidth - margin - analysisMarginRight // 185mm de ancho disponible
      const analysisMaxTextWidth = analysisContentWidth - (textMargin * 2) // 175mm de ancho máximo
      
      const textStartX = margin + textMargin // 25mm desde el borde izquierdo (20 + 5)
      
      // Usar casi todo el ancho disponible: 173mm
      // De 210mm total: 20mm margen izq + 25mm inicio + 173mm texto + 2mm margen der (mínimo)
      const safeTextWidth = analysisMaxTextWidth - 2 // 173mm - usar casi todo el espacio disponible
      
      // PROBLEMA: jsPDF con align: 'justify' puede expandir texto más allá de maxWidth
      // SOLUCIÓN: Dividir el texto con un ancho conservador (85% del ancho final) para compensar expansión
      // y mantener justificación en todas las líneas que quepan
      
      // Dividir el texto inicialmente con 85% del ancho final para compensar expansión de justificación
      const splitWidth = safeTextWidth * 0.85 // 142.8mm para splitTextToSize (85% del ancho final)
      let splitText = doc.splitTextToSize(analysisText, splitWidth)
      
      // Verificación línea por línea para asegurar que quepa con justificación
      const maxWidthPoints = safeTextWidth * 2.83465 // Convertir mm a puntos
      const splitTextFinal: string[] = []
      
      // Límite para división: 75% del ancho máximo para dejar espacio a la expansión de justificación
      const strictWidthPoints = maxWidthPoints * 0.75
      
      splitText.forEach((line: string) => {
        const lineWidthPoints = doc.getTextWidth(line.trim())
        
        // Si la línea es demasiado ancha, dividirla manualmente por palabras
        if (lineWidthPoints > strictWidthPoints) {
          const words = line.trim().split(/\s+/)
          let currentLine = ''
          
          words.forEach((word: string) => {
            if (!word.trim()) return
            
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const testWidthPoints = doc.getTextWidth(testLine)
            
            // Usar 75% del ancho máximo para asegurar que quepa con justificación
            if (testWidthPoints <= strictWidthPoints) {
              currentLine = testLine
            } else {
              if (currentLine.trim()) {
                splitTextFinal.push(currentLine.trim())
              }
              
              // Si la palabra individual es muy larga, agregarla en su propia línea
              const wordWidth = doc.getTextWidth(word)
              if (wordWidth > maxWidthPoints * 0.75) {
                splitTextFinal.push(word)
                currentLine = ''
              } else {
                currentLine = word
              }
            }
          })
          
          if (currentLine.trim()) {
            splitTextFinal.push(currentLine.trim())
          }
        } else {
          // La línea es suficientemente corta, agregarla directamente
          splitTextFinal.push(line.trim())
        }
      })
      
      // Manejar páginas múltiples
      let currentY = yPos
      const lineHeight = 4.5
      const maxY = 245
      
      splitTextFinal.forEach((line: string) => {
        // Verificar si necesitamos una nueva página
        if (currentY + lineHeight > maxY) {
          doc.addPage()
          currentY = 25 // Margen superior en nueva página
        }
        
        // Verificación final: si la línea es demasiado ancha, usar alineación izquierda
        const finalLineWidth = doc.getTextWidth(line)
        
        if (finalLineWidth > maxWidthPoints * 0.85) {
          // Línea demasiado ancha - renderizar sin justificación para evitar desbordes
          doc.text(line, textStartX, currentY, { 
            maxWidth: safeTextWidth,
            align: 'left'
          })
        } else {
          // Línea dentro del límite seguro - renderizar CON JUSTIFICACIÓN
          doc.text(line, textStartX, currentY, { 
            maxWidth: safeTextWidth,
            align: 'justify'
          })
        }
        currentY += lineHeight
      })
      
      // ========== PIE DE PÁGINA EN TODAS LAS PÁGINAS ==========
      const totalPages = doc.internal.pages.length - 1
      const footerY = 270 // Posición del pie de página
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        
        // Línea separadora (respetando márgenes optimizados)
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.line(margin, footerY - 3, pageWidth - marginRight, footerY - 3)
        
        // Texto del pie de página
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        
        if (i === totalPages) {
          // En la última página, mostrar información completa
          const footerTextLeft = 'Generado el ' + new Date().toLocaleString('es-ES')
          const footerTextRight = 'Sistema de Auditoría Informática'
          
          // Asegurar que los textos no se salgan usando splitTextToSize si es necesario
          const leftTextWidth = doc.getTextWidth(footerTextLeft)
          const rightTextWidth = doc.getTextWidth(footerTextRight)
          const availableWidth = (contentWidth - (textMargin * 2)) / 2
          
          if (leftTextWidth <= availableWidth) {
            doc.text(footerTextLeft, margin + textMargin, footerY + 3)
          } else {
            const leftLines = doc.splitTextToSize(footerTextLeft, availableWidth)
            doc.text(leftLines, margin + textMargin, footerY + 3, { maxWidth: availableWidth })
          }
          
          if (rightTextWidth <= availableWidth) {
            doc.text(footerTextRight, pageWidth - marginRight - textMargin, footerY + 3, { align: 'right' })
          } else {
            const rightLines = doc.splitTextToSize(footerTextRight, availableWidth)
            doc.text(rightLines, pageWidth - marginRight - textMargin, footerY + 3, { align: 'right', maxWidth: availableWidth })
          }
        }
        
        // Numeración de página (centrada)
        doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, footerY + 3, { align: 'center' })
      }
      
      doc.setTextColor(0, 0, 0)
      
      // Guardar PDF
      doc.save(`resumen_ejecutivo_${selectedAudit.code}_${Date.now()}.pdf`)
    })
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-pure-white p-6 rounded-lg shadow-md border border-elegant-gray">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-dark-gray">Resumen Ejecutivo</h2>
          <button
            onClick={onBack}
            className="bg-dark-gray text-pure-white px-4 py-2 rounded hover:bg-opacity-90 transition"
          >
            Volver
          </button>
        </div>
        <div className="space-y-4">
          {/* Filtro por área */}
          <div>
            <label className="block text-sm font-medium mb-2 text-dark-gray">Filtrar por Área (Opcional)</label>
            <select
              value={selectedAreaFilter || ''}
              onChange={(e) => setSelectedAreaFilter(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-light-blue rounded bg-elegant-gray text-dark-gray focus:outline-none focus:ring-2 focus:ring-light-blue"
            >
              <option value="">Todas las áreas</option>
              {areas.map((area: any) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
            {selectedAreaFilter && (
              <p className="text-sm text-institutional-green mt-1">
                Mostrando {filteredAudits.length} auditoría(s) de {areas.find((a: any) => a.id === selectedAreaFilter)?.name}
              </p>
            )}
          </div>
          
          <p className="text-dark-gray opacity-70">Seleccione una auditoría para generar un reporte PDF ejecutivo con análisis de resultados</p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {sortedAudits.map((audit: any) => (
              <div
                key={audit.id}
                onClick={() => setSelectedAudit(audit)}
                className={`p-3 border rounded cursor-pointer transition ${
                  selectedAudit?.id === audit.id
                    ? 'bg-institutional-green border-institutional-green text-pure-white'
                    : 'bg-pure-white border-elegant-gray hover:bg-elegant-gray text-dark-gray'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{audit.areaName}</span>
                  <span className="text-sm opacity-90">{audit.percentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm opacity-70 mt-1">
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
            className="bg-institutional-green text-pure-white px-6 py-2 rounded hover:bg-opacity-90 disabled:bg-elegant-gray disabled:text-dark-gray disabled:cursor-not-allowed transition"
          >
            Generar PDF Ejecutivo
          </button>
        </div>
      </div>
    </div>
  )
}

function generateDetailedAnalysis(audit: any, passed: number, total: number, evaluation: string): string {
  const { areaName, percentage, questions, answers } = audit
  
  // Calcular métricas adicionales
  const failedCount = total - passed
  const passRate = passed / total
  const riskLevel = percentage < 40 ? 'crítico' : percentage < 60 ? 'alto' : percentage < 80 ? 'moderado' : 'bajo'
  
  // Identificar áreas problemáticas (preguntas no cumplidas)
  const failedQuestions = questions.filter((q: any) => {
    const answerData = answers[q.id]
    const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
    return !answerValue
  })
  
  // Analizar por severidad
  const highSeverityFailed = failedQuestions.filter((q: any) => q.severity >= 8)
  const mediumSeverityFailed = failedQuestions.filter((q: any) => q.severity >= 5 && q.severity < 8)
  const lowSeverityFailed = failedQuestions.filter((q: any) => q.severity < 5)
  
  // Calcular impacto total
  const totalSeverityWeight = questions.reduce((sum: number, q: any) => sum + q.severity, 0)
  const failedSeverityWeight = failedQuestions.reduce((sum: number, q: any) => sum + q.severity, 0)
  const impactPercentage = totalSeverityWeight > 0 ? (failedSeverityWeight / totalSeverityWeight) * 100 : 0
  
  // Generar análisis contextual extenso
  let analysis = ''
  
  // Introducción contextual más detallada
  analysis += `la auditoría informática realizada al área de ${areaName.toLowerCase()} el ${new Date(audit.date).toLocaleDateString('es-ES')} presenta un nivel de cumplimiento ${evaluation.toLowerCase()}. `
  analysis += `este informe detallado proporciona un análisis exhaustivo de los controles de seguridad informática evaluados, identificando las fortalezas del área y las áreas que requieren atención y mejora. `
  
  // Análisis de cumplimiento más extenso
  if (percentage >= 90) {
    analysis += `con un ${percentage.toFixed(1)} por ciento de cumplimiento, esta área demuestra un desempeño ejemplar en seguridad informática. `
    analysis += `los controles implementados muestran un alto grado de madurez y efectividad. `
    analysis += `el área ha logrado establecer prácticas de seguridad robustas que protegen adecuadamente los activos informáticos y la información sensible. `
  } else if (percentage >= 70) {
    analysis += `con un ${percentage.toFixed(1)} por ciento de cumplimiento, el área muestra un buen nivel de madurez en sus controles de seguridad. `
    analysis += `existe una base sólida de controles implementados, sin embargo, hay oportunidades identificadas para fortalecer aún más la postura de seguridad. `
    analysis += `las áreas de mejora identificadas permitirán alcanzar niveles de excelencia en seguridad informática. `
  } else if (percentage >= 50) {
    analysis += `con un ${percentage.toFixed(1)} por ciento de cumplimiento, existen oportunidades claras de mejora en los controles implementados. `
    analysis += `aunque se han establecido algunos controles básicos, se requiere atención inmediata en áreas críticas para fortalecer la seguridad informática del área. `
    analysis += `la implementación de controles adicionales y la mejora de los existentes son prioritarias para reducir los riesgos identificados. `
  } else {
    analysis += `con un ${percentage.toFixed(1)} por ciento de cumplimiento, se identifican deficiencias significativas que requieren atención inmediata. `
    analysis += `el área presenta vulnerabilidades críticas que exponen a la organización a riesgos considerables en seguridad informática. `
    analysis += `es imperativo desarrollar e implementar un plan de acción urgente y comprensivo para abordar las deficiencias identificadas y establecer controles efectivos. `
  }
  
  // Análisis cuantitativo más detallado
  const passRatePercent = (passRate * 100).toFixed(0)
  const failRatePercent = ((failedCount/total)*100).toFixed(0)
  analysis += `de un total de ${total} controles evaluados, ${passed} equivalente al ${passRatePercent} por ciento fueron implementados correctamente, mientras que ${failedCount} equivalente al ${failRatePercent} por ciento presentan deficiencias. `
  analysis += `esta distribución de cumplimiento refleja la necesidad de enfocar los esfuerzos de mejora en las áreas no cumplidas, priorizando aquellas de mayor criticidad. `
  
  // Análisis de severidad e impacto más extenso
  if (failedQuestions.length > 0) {
    analysis += `el análisis detallado de las áreas no cumplidas revela información crítica sobre el estado de la seguridad informática. `
    
    if (highSeverityFailed.length > 0) {
      const controlText = highSeverityFailed.length > 1 ? 'controles' : 'control'
      analysis += `se identificaron ${highSeverityFailed.length} ${controlText} de alta criticidad con severidad mayor o igual a ocho, lo que representa un riesgo significativo para la seguridad informática del área. `
      analysis += `estos controles de alta severidad requieren atención inmediata ya que su ausencia o implementación deficiente puede resultar en vulnerabilidades críticas que comprometan la seguridad de los sistemas y la información. `
    }
    
    if (mediumSeverityFailed.length > 0) {
      const controlText = mediumSeverityFailed.length > 1 ? 'controles' : 'control'
      analysis += `adicionalmente, se encontraron ${mediumSeverityFailed.length} ${controlText} de severidad media entre cinco y siete que afectan la robustez de los controles. `
      analysis += `aunque estos controles no presentan el mismo nivel de criticidad, su implementación adecuada es esencial para mantener una postura de seguridad sólida y reducir riesgos potenciales. `
    }
    
    if (lowSeverityFailed.length > 0) {
      const controlText = lowSeverityFailed.length > 1 ? 'controles' : 'control'
      analysis += `finalmente, ${lowSeverityFailed.length} ${controlText} de menor criticidad fueron identificados como no cumplidos. `
      analysis += `aunque menos urgentes, estos controles contribuyen al nivel general de madurez en seguridad informática y su implementación fortalecerá la postura de seguridad del área. `
    }
    
    analysis += `considerando el peso relativo de los controles no cumplidos, el impacto real en la seguridad informática se estima en ${impactPercentage.toFixed(1)} por ciento del total del programa de seguridad. `
    analysis += `esta métrica proporciona una perspectiva más precisa del riesgo real, ya que considera no solo la cantidad de controles no cumplidos, sino también su nivel de severidad e importancia relativa. `
  }
  
  // Evaluación de riesgo más detallada
  analysis += `el nivel de riesgo general se clasifica como ${riskLevel}. `
  if (riskLevel === 'crítico') {
    analysis += `este nivel de riesgo indica que la organización está expuesta a vulnerabilidades significativas que requieren intervención inmediata. `
    analysis += `se recomienda activar protocolos de respuesta rápida y asignar recursos prioritarios para abordar las deficiencias críticas identificadas. `
  } else if (riskLevel === 'alto') {
    analysis += `este nivel de riesgo señala la presencia de vulnerabilidades importantes que deben ser abordadas con urgencia. `
    analysis += `se recomienda desarrollar un plan de acción estructurado con plazos definidos para reducir el nivel de riesgo a un rango aceptable. `
  } else if (riskLevel === 'moderado') {
    analysis += `este nivel de riesgo indica que aunque existen áreas de mejora, la postura de seguridad general es manejable. `
    analysis += `se recomienda implementar mejoras progresivas siguiendo un plan de acción bien estructurado. `
  } else {
    analysis += `este nivel de riesgo indica una postura de seguridad sólida con controles efectivos implementados. `
    analysis += `se recomienda mantener los estándares actuales y continuar con mejoras continuas para mantener este nivel de excelencia. `
  }
  
  // Recomendaciones más extensas y detalladas
  if (percentage >= 80) {
    analysis += `se recomienda mantener los altos estándares actuales implementando mejoras continuas en las áreas identificadas. `
    analysis += `es importante considerar la adopción de mejores prácticas adicionales y mantener un programa de mejora continua. `
    analysis += `la capacitación continua del personal en temas de seguridad informática y la revisión periódica de controles contribuirán a mantener este nivel de excelencia. `
    analysis += `se sugiere establecer métricas de seguimiento para monitorear el desempeño de los controles y detectar oportunamente cualquier desviación. `
    analysis += `la realización de auditorías periódicas permitirá identificar nuevas oportunidades de mejora y mantener la efectividad de los controles implementados. `
  } else if (percentage >= 60) {
    analysis += `se recomienda desarrollar un plan de acción estructurado con priorización clara de las deficiencias de mayor severidad. `
    analysis += `la asignación de recursos específicos y la definición de responsables para cada acción permitirán cerrar las brechas identificadas de manera efectiva. `
    analysis += `es fundamental establecer revisiones periódicas para monitorear el progreso de las mejoras implementadas y ajustar el plan según sea necesario. `
    analysis += `se sugiere establecer hitos y métricas de éxito para cada acción del plan, permitiendo un seguimiento objetivo del progreso. `
    analysis += `la comunicación regular del estado del plan de acción a la dirección y los stakeholders facilitará la obtención de apoyo y recursos necesarios. `
  } else if (percentage >= 40) {
    analysis += `se recomienda urgentemente desarrollar e implementar un plan de acción inmediato y comprensivo para abordar las deficiencias identificadas. `
    analysis += `se deben asignar recursos prioritarios para abordar las deficiencias críticas y de alta severidad, estableciendo plazos agresivos pero realistas. `
    analysis += `la dirección del área debe involucrarse activamente para asegurar el cumplimiento de los plazos establecidos en el plan de remediación y proporcionar el apoyo necesario. `
    analysis += `la auditoría de seguimiento debe realizarse en un plazo no mayor a tres meses para verificar el progreso en la implementación de las mejoras. `
    analysis += `se recomienda establecer un comité de seguimiento que se reúna semanalmente para revisar el avance del plan de acción y resolver cualquier impedimento. `
    analysis += `la documentación detallada de todas las acciones tomadas y los resultados obtenidos será fundamental para el seguimiento y la mejora continua. `
  } else {
    analysis += `se requiere intervención inmediata por parte de la dirección ejecutiva y de seguridad informática para abordar las deficiencias críticas identificadas. `
    analysis += `es imperativo asignar recursos especializados y establecer un programa de remediación agresivo con metas a corto, mediano y largo plazo. `
    analysis += `todas las deficiencias críticas deben ser abordadas en un plazo máximo de treinta días para reducir significativamente el nivel de riesgo. `
    analysis += `se recomienda realizar una auditoría de seguimiento mensual hasta alcanzar al menos un sesenta por ciento de cumplimiento, momento en el cual se puede ajustar la frecuencia a trimestral. `
    analysis += `la situación actual expone a la organización a riesgos operativos y regulatorios significativos que pueden tener consecuencias graves si no se abordan adecuadamente. `
    analysis += `se sugiere establecer un equipo de trabajo dedicado exclusivamente a la implementación del plan de remediación, con reportes diarios del progreso a la dirección. `
    analysis += `la implementación de controles temporales o mitigaciones puede ser necesaria mientras se desarrollan e implementan las soluciones permanentes. `
  }
  
  return analysis.toLowerCase()
}

function DetailedSummary({ audits, areas, onBack }: any) {
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
      const doc = new jsPDF('portrait', 'mm', 'a4')
      
      // Colores corporativos (RGB)
      const corporateBlue = [10, 61, 98]
      const lightBlue = [60, 141, 188]
      const institutionalGreen = [40, 167, 69]
      const darkGray = [44, 62, 80]
      const elegantGray = [229, 229, 229]
      
      // Cálculos
      const passed = selectedAudit.questions.filter((q: any) => {
        const answerData = selectedAudit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        return answerValue
      }).length
      const total = selectedAudit.questions.length
      const failed = total - passed
      const evaluation = selectedAudit.percentage >= 80 ? 'EXCELENTE' : 
                        selectedAudit.percentage >= 60 ? 'BUENO' :
                        selectedAudit.percentage >= 40 ? 'REGULAR' : 'REQUIERE MEJORA'
      
      // Identificar fallas (preguntas no cumplidas)
      const failedQuestions = selectedAudit.questions.filter((q: any) => {
        const answerData = selectedAudit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        return !answerValue
      }).map((q: any) => {
        const answerData = selectedAudit.answers[q.id]
        const observation = typeof answerData === 'object' ? (answerData?.observation || '') : ''
        return {
          ...q,
          code: q.code || selectedAudit.code || 'N/A', // Usar código de la pregunta o de la auditoría
          observation
        }
      })
      
      // Función auxiliar para dibujar caja con fondo
      const drawBox = (x: number, y: number, width: number, height: number, color: number[], text: string, fontSize: number = 10, bold: boolean = false) => {
        doc.setFillColor(color[0], color[1], color[2])
        doc.roundedRect(x, y, width, height, 2, 2, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.text(text, x + width / 2, y + height / 2 + 2, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }
      
      // Función auxiliar para dibujar barra de progreso
      const drawProgressBar = (x: number, y: number, width: number, height: number, percentage: number, color: number[]) => {
        doc.setFillColor(elegantGray[0], elegantGray[1], elegantGray[2])
        doc.roundedRect(x, y, width, height, 1, 1, 'F')
        const progressWidth = (width * percentage) / 100
        doc.setFillColor(color[0], color[1], color[2])
        doc.roundedRect(x, y, progressWidth, height, 1, 1, 'F')
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.1)
        doc.roundedRect(x, y, width, height, 1, 1, 'S')
      }
      
      let yPos = 15
      const pageWidth = 210
      const margin = 20
      const marginRight = 10
      const textMargin = 5
      const contentWidth = pageWidth - margin - marginRight
      const maxTextWidth = contentWidth - (textMargin * 2)
      
      // ========== ENCABEZADO ==========
      doc.setFillColor(corporateBlue[0], corporateBlue[1], corporateBlue[2])
      doc.rect(0, 0, pageWidth, 35, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('REPORTE DETALLADO', pageWidth / 2, 18, { align: 'center' })
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('AUDITORÍA INFORMÁTICA', pageWidth / 2, 26, { align: 'center' })
      
      doc.setTextColor(0, 0, 0)
      yPos = 40
      
      // ========== INFORMACIÓN DE LA AUDITORÍA ==========
      doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
      doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMACIÓN DE LA AUDITORÍA', margin + contentWidth / 2, yPos + 5.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 12
      
      const infoData = [
        ['Fecha de Realización:', new Date(selectedAudit.date).toLocaleDateString('es-ES')],
        ['Fecha y Hora:', new Date(selectedAudit.date).toLocaleString('es-ES')],
        ['Área Auditada:', selectedAudit.areaName],
        ['Código de Auditoría:', selectedAudit.code]
      ]
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      infoData.forEach(([label, value], index) => {
        const rowY = yPos + (index * 7)
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin + textMargin, rowY)
        doc.setFont('helvetica', 'normal')
        const maxLabelWidth = 65
        const valueX = margin + textMargin + maxLabelWidth
        const valueLines = doc.splitTextToSize(value, contentWidth - maxLabelWidth - (textMargin * 2))
        doc.text(valueLines, valueX, rowY, { maxWidth: contentWidth - maxLabelWidth - (textMargin * 2) })
      })
      yPos += 32
      
      // ========== MÉTRICAS ==========
      const percentageColor = selectedAudit.percentage >= 80 ? institutionalGreen :
                              selectedAudit.percentage >= 60 ? lightBlue :
                              selectedAudit.percentage >= 40 ? [255, 193, 7] : [220, 53, 69]
      
      drawBox(margin, yPos, contentWidth, 20, percentageColor, `${selectedAudit.percentage.toFixed(1)}%`, 24, true)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('PORCENTAJE DE CUMPLIMIENTO', pageWidth / 2, yPos + 16, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 25
      
      const boxWidth = (contentWidth - 5) / 2
      
      drawBox(margin, yPos, boxWidth, 15, institutionalGreen, `${passed}`, 16, true)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Preguntas Cumplidas', margin + boxWidth / 2, yPos + 11, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      
      drawBox(margin + boxWidth + 5, yPos, boxWidth, 15, [220, 53, 69], `${failed}`, 16, true)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Preguntas No Cumplidas', margin + boxWidth + 5 + boxWidth / 2, yPos + 11, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 20
      
      doc.setFillColor(elegantGray[0], elegantGray[1], elegantGray[2])
      doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F')
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total de Preguntas Evaluadas: ${total}`, pageWidth / 2, yPos + 7.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 18
      
      // ========== BARRA DE PROGRESO ==========
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      const progressBarStartX = margin + textMargin
      doc.text('Progreso de Cumplimiento', progressBarStartX, yPos)
      yPos += 6
      
      const progressBarWidth = maxTextWidth - 2
      const progressBarHeight = 8
      drawProgressBar(progressBarStartX, yPos, progressBarWidth, progressBarHeight, selectedAudit.percentage, percentageColor)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      const percentageText = `${selectedAudit.percentage.toFixed(1)}%`
      const barStartX = progressBarStartX
      const textX = barStartX + (progressBarWidth * selectedAudit.percentage) / 100 - (doc.getTextWidth(percentageText) / 2)
      const maxBarEndX = barStartX + progressBarWidth
      if (textX > barStartX && textX + doc.getTextWidth(percentageText) < maxBarEndX) {
        doc.text(percentageText, textX, yPos + 5.5)
      } else {
        doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
        const maxRightX = margin + contentWidth - doc.getTextWidth(percentageText) - 2
        const textAfterBarX = Math.min(barStartX + progressBarWidth + 3, maxRightX)
        doc.text(percentageText, textAfterBarX, yPos + 5.5)
      }
      doc.setTextColor(0, 0, 0)
      yPos += 15
      
      // ========== EVALUACIÓN GENERAL ==========
      doc.setFillColor(corporateBlue[0], corporateBlue[1], corporateBlue[2])
      doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`EVALUACIÓN: ${evaluation}`, pageWidth / 2, yPos + 6.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 16
      
      // ========== ANÁLISIS DETALLADO DE RESULTADOS ==========
      doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
      doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('ANÁLISIS DETALLADO DE RESULTADOS', margin + contentWidth / 2, yPos + 5.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 12
      
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      
      const analysisText = generateDetailedAnalysis(selectedAudit, passed, total, evaluation)
      
      const analysisMarginRight = 5
      const analysisContentWidth = pageWidth - margin - analysisMarginRight
      const analysisMaxTextWidth = analysisContentWidth - (textMargin * 2)
      const textStartX = margin + textMargin
      const safeTextWidth = analysisMaxTextWidth - 2
      
      const splitWidth = safeTextWidth * 0.85
      let splitText = doc.splitTextToSize(analysisText, splitWidth)
      
      const maxWidthPoints = safeTextWidth * 2.83465
      const splitTextFinal: string[] = []
      const strictWidthPoints = maxWidthPoints * 0.75
      
      splitText.forEach((line: string) => {
        const lineWidthPoints = doc.getTextWidth(line.trim())
        
        if (lineWidthPoints > strictWidthPoints) {
          const words = line.trim().split(/\s+/)
          let currentLine = ''
          
          words.forEach((word: string) => {
            if (!word.trim()) return
            
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const testWidthPoints = doc.getTextWidth(testLine)
            
            if (testWidthPoints <= strictWidthPoints) {
              currentLine = testLine
            } else {
              if (currentLine.trim()) {
                splitTextFinal.push(currentLine.trim())
              }
              
              const wordWidth = doc.getTextWidth(word)
              if (wordWidth > maxWidthPoints * 0.75) {
                splitTextFinal.push(word)
                currentLine = ''
              } else {
                currentLine = word
              }
            }
          })
          
          if (currentLine.trim()) {
            splitTextFinal.push(currentLine.trim())
          }
        } else {
          splitTextFinal.push(line.trim())
        }
      })
      
      let currentY = yPos
      const lineHeight = 4.5
      const maxY = 245
      
      splitTextFinal.forEach((line: string) => {
        if (currentY + lineHeight > maxY) {
          doc.addPage()
          currentY = 25
        }
        
        const finalLineWidth = doc.getTextWidth(line)
        
        if (finalLineWidth > maxWidthPoints * 0.80) {
          doc.text(line, textStartX, currentY, { 
            maxWidth: safeTextWidth,
            align: 'left'
          })
        } else {
          doc.text(line, textStartX, currentY, { 
            maxWidth: safeTextWidth,
            align: 'justify'
          })
        }
        currentY += lineHeight
      })
      
      yPos = currentY + 8
      
      // ========== FALLAS Y FALENCIAS IDENTIFICADAS ==========
      if (failedQuestions.length > 0) {
        if (yPos > maxY - 30) {
          doc.addPage()
          yPos = 25
        }
        
        doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
        doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('FALLAS Y FALENCIAS IDENTIFICADAS', margin + contentWidth / 2, yPos + 5.5, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        yPos += 12
        
        // Ordenar fallas por severidad (mayor a menor)
        const sortedFailures = [...failedQuestions].sort((a: any, b: any) => b.severity - a.severity)
        
        // Agrupar por severidad
        const highSeverityFailures = sortedFailures.filter((q: any) => q.severity >= 8)
        const mediumSeverityFailures = sortedFailures.filter((q: any) => q.severity >= 5 && q.severity < 8)
        const lowSeverityFailures = sortedFailures.filter((q: any) => q.severity < 5)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        
        // Listar fallas de alta severidad
        if (highSeverityFailures.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
          doc.text('Fallas de Alta Criticidad (Severidad mayor o igual a 8):', margin + textMargin, yPos)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          yPos += 7
          
          highSeverityFailures.forEach((failure: any, index: number) => {
            if (yPos > maxY - 20) {
              doc.addPage()
              yPos = 25
            }
            
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            const failureTitle = `${index + 1}. ${failure.text}`
            const titleLines = doc.splitTextToSize(failureTitle, safeTextWidth)
            doc.text(titleLines, textStartX, yPos, { maxWidth: safeTextWidth })
            yPos += (titleLines.length * 4.5)
            
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(100, 100, 100)
            doc.text(`Código: ${failure.code || 'N/A'} | Severidad: ${failure.severity}`, textStartX, yPos)
            yPos += 5
            
            if (failure.observation && failure.observation.trim()) {
              doc.setTextColor(0, 0, 0)
              doc.setFont('helvetica', 'italic')
              doc.setFontSize(8)
              const observationLines = doc.splitTextToSize(`Observación: ${failure.observation}`, safeTextWidth - 5)
              doc.text(observationLines, textStartX + 2, yPos, { maxWidth: safeTextWidth - 5 })
              yPos += (observationLines.length * 4)
            }
            
            yPos += 4
            doc.setTextColor(0, 0, 0)
          })
          
          yPos += 5
        }
        
        // Listar fallas de severidad media
        if (mediumSeverityFailures.length > 0) {
          if (yPos > maxY - 25) {
            doc.addPage()
            yPos = 25
          }
          
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
          doc.text('Fallas de Severidad Media (Severidad 5-7):', margin + textMargin, yPos)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          yPos += 7
          
          mediumSeverityFailures.forEach((failure: any, index: number) => {
            if (yPos > maxY - 20) {
              doc.addPage()
              yPos = 25
            }
            
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            const failureTitle = `${index + 1}. ${failure.text}`
            const titleLines = doc.splitTextToSize(failureTitle, safeTextWidth)
            doc.text(titleLines, textStartX, yPos, { maxWidth: safeTextWidth })
            yPos += (titleLines.length * 4.5)
            
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(100, 100, 100)
            doc.text(`Código: ${failure.code || 'N/A'} | Severidad: ${failure.severity}`, textStartX, yPos)
            yPos += 5
            
            if (failure.observation && failure.observation.trim()) {
              doc.setTextColor(0, 0, 0)
              doc.setFont('helvetica', 'italic')
              doc.setFontSize(8)
              const observationLines = doc.splitTextToSize(`Observación: ${failure.observation}`, safeTextWidth - 5)
              doc.text(observationLines, textStartX + 2, yPos, { maxWidth: safeTextWidth - 5 })
              yPos += (observationLines.length * 4)
            }
            
            yPos += 4
            doc.setTextColor(0, 0, 0)
          })
          
          yPos += 5
        }
        
        // Listar fallas de baja severidad
        if (lowSeverityFailures.length > 0) {
          if (yPos > maxY - 25) {
            doc.addPage()
            yPos = 25
          }
          
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
          doc.text('Fallas de Baja Severidad (Severidad < 5):', margin + textMargin, yPos)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          yPos += 7
          
          lowSeverityFailures.forEach((failure: any, index: number) => {
            if (yPos > maxY - 20) {
              doc.addPage()
              yPos = 25
            }
            
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            const failureTitle = `${index + 1}. ${failure.text}`
            const titleLines = doc.splitTextToSize(failureTitle, safeTextWidth)
            doc.text(titleLines, textStartX, yPos, { maxWidth: safeTextWidth })
            yPos += (titleLines.length * 4.5)
            
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(100, 100, 100)
            doc.text(`Código: ${failure.code || 'N/A'} | Severidad: ${failure.severity}`, textStartX, yPos)
            yPos += 5
            
            if (failure.observation && failure.observation.trim()) {
              doc.setTextColor(0, 0, 0)
              doc.setFont('helvetica', 'italic')
              doc.setFontSize(8)
              const observationLines = doc.splitTextToSize(`Observación: ${failure.observation}`, safeTextWidth - 5)
              doc.text(observationLines, textStartX + 2, yPos, { maxWidth: safeTextWidth - 5 })
              yPos += (observationLines.length * 4)
            }
            
            yPos += 4
            doc.setTextColor(0, 0, 0)
          })
        }
      }
      
      // ========== PIE DE PÁGINA ==========
      const totalPages = doc.internal.pages.length - 1
      const footerY = 270
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.line(margin, footerY - 3, pageWidth - marginRight, footerY - 3)
        
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        
        if (i === totalPages) {
          const footerTextLeft = 'Generado el ' + new Date().toLocaleString('es-ES')
          const footerTextRight = 'Sistema de Auditoría Informática'
          
          const leftTextWidth = doc.getTextWidth(footerTextLeft)
          const rightTextWidth = doc.getTextWidth(footerTextRight)
          const availableWidth = (contentWidth - (textMargin * 2)) / 2
          
          if (leftTextWidth <= availableWidth) {
            doc.text(footerTextLeft, margin + textMargin, footerY + 3)
          } else {
            const leftLines = doc.splitTextToSize(footerTextLeft, availableWidth)
            doc.text(leftLines, margin + textMargin, footerY + 3, { maxWidth: availableWidth })
          }
          
          if (rightTextWidth <= availableWidth) {
            doc.text(footerTextRight, pageWidth - marginRight - textMargin, footerY + 3, { align: 'right' })
          } else {
            const rightLines = doc.splitTextToSize(footerTextRight, availableWidth)
            doc.text(rightLines, pageWidth - marginRight - textMargin, footerY + 3, { align: 'right', maxWidth: availableWidth })
          }
        }
        
        doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, footerY + 3, { align: 'center' })
      }
      
      doc.save(`resumen_detallado_${selectedAudit.code}_${Date.now()}.pdf`)
    })
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-pure-white p-6 rounded-lg shadow-md border border-elegant-gray">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-dark-gray">Resumen Detallado</h2>
          <button
            onClick={onBack}
            className="bg-dark-gray text-pure-white px-4 py-2 rounded hover:bg-opacity-90 transition"
          >
            Volver
          </button>
        </div>
        <div className="space-y-4">
          {/* Filtro por área */}
          <div>
            <label className="block text-sm font-medium mb-2 text-dark-gray">Filtrar por Área (Opcional)</label>
            <select
              value={selectedAreaFilter || ''}
              onChange={(e) => setSelectedAreaFilter(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-light-blue rounded bg-elegant-gray text-dark-gray focus:outline-none focus:ring-2 focus:ring-light-blue"
            >
              <option value="">Todas las áreas</option>
              {areas.map((area: any) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
            {selectedAreaFilter && (
              <p className="text-sm text-institutional-green mt-1">
                Mostrando {filteredAudits.length} auditoría(s) de {areas.find((a: any) => a.id === selectedAreaFilter)?.name}
              </p>
            )}
          </div>
          
          <p className="text-dark-gray opacity-70">Seleccione una auditoría para generar un reporte PDF detallado con análisis extenso y fallas identificadas</p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {sortedAudits.map((audit: any) => (
              <div
                key={audit.id}
                onClick={() => setSelectedAudit(audit)}
                className={`p-3 border rounded cursor-pointer transition ${
                  selectedAudit?.id === audit.id
                    ? 'bg-light-blue border-light-blue text-pure-white'
                    : 'bg-pure-white border-elegant-gray hover:bg-elegant-gray text-dark-gray'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{audit.areaName}</span>
                  <span className="text-sm opacity-90">{audit.percentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm opacity-70 mt-1">
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
            className="bg-light-blue text-pure-white px-6 py-2 rounded hover:bg-opacity-90 disabled:bg-elegant-gray disabled:text-dark-gray disabled:cursor-not-allowed transition"
          >
            Generar PDF Detallado
          </button>
        </div>
      </div>
    </div>
  )
}

function CompleteAudit({ audits, areas, onBack }: any) {
  const [selectedAudit, setSelectedAudit] = useState<any>(null)
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Filtrar auditorías por área si hay filtro seleccionado
  const filteredAudits = selectedAreaFilter 
    ? audits.filter((a: any) => a.areaId === selectedAreaFilter)
    : audits
  
  // Ordenar por fecha de más reciente a más antigua
  const sortedAudits = [...filteredAudits].sort((a: any, b: any) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
  
  // Función para exportar Excel de respuestas (igual que ExportExcelQuestions)
  const exportExcelResponses = (audit: any) => {
    return import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new()
      const data = []
      
      data.push(['REPORTE DE AUDITORÍA INFORMÁTICA'])
      data.push([])
      data.push(['ÁREA AUDITADA:', audit.areaName])
      data.push(['CÓDIGO DE AUDITORÍA:', audit.code])
      data.push(['FECHA DE REALIZACIÓN:', new Date(audit.date).toLocaleDateString()])
      data.push(['FECHA Y HORA:', new Date(audit.date).toLocaleString('es-ES')])
      data.push([])
      data.push(['#', 'PREGUNTA', 'ESTADO', 'OBSERVACIONES'])
      
      audit.questions.forEach((q: any, index: number) => {
        const answerData = audit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        const observation = typeof answerData === 'object' ? (answerData?.observation || '') : ''
        const status = answerValue ? 'Cumple' : 'No Cumple'
        data.push([index + 1, q.text, status, observation])
      })
      
      data.push([])
      data.push([])
      data.push(['='.repeat(80)])
      data.push(['RESUMEN DEL CUMPLIMIENTO'])
      data.push(['='.repeat(80)])
      data.push([])
      data.push(['PORCENTAJE DE CUMPLIMIENTO:', `${audit.percentage.toFixed(1)}%`])
      const passed = audit.questions.filter((q: any) => {
        const answerData = audit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        return answerValue
      }).length
      const total = audit.questions.length
      data.push(['PREGUNTAS CUMPLIDAS:', `${passed} de ${total}`])
      data.push(['PREGUNTAS NO CUMPLIDAS:', `${total - passed} de ${total}`])
      data.push([])
      
      const evaluation = audit.percentage >= 80 ? 'EXCELENTE' : 
                        audit.percentage >= 60 ? 'BUENO' :
                        audit.percentage >= 40 ? 'REGULAR' : 'REQUIERE MEJORA'
      data.push(['EVALUACIÓN GENERAL:', evaluation])
      data.push(['='.repeat(80)])
      
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws['!cols'] = [{ wch: 6 }, { wch: 65 }, { wch: 18 }, { wch: 50 }]
      
      XLSX.utils.book_append_sheet(wb, ws, audit.areaName)
      XLSX.writeFile(wb, `respuestas_${audit.areaName}_${audit.code}_${Date.now()}.xlsx`)
    })
  }
  
  // Función para generar PDF Ejecutivo (reutilizar lógica de ExecutiveSummary)
  const generateExecutivePDF = (audit: any) => {
    return import('jspdf').then((jsPDFModule: any) => {
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF || jsPDFModule
      const doc = new jsPDF('portrait', 'mm', 'a4')
      
      const corporateBlue = [10, 61, 98]
      const lightBlue = [60, 141, 188]
      const institutionalGreen = [40, 167, 69]
      const darkGray = [44, 62, 80]
      const elegantGray = [229, 229, 229]
      
      const passed = audit.questions.filter((q: any) => {
        const answerData = audit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        return answerValue
      }).length
      const total = audit.questions.length
      const failed = total - passed
      const evaluation = audit.percentage >= 80 ? 'EXCELENTE' : 
                        audit.percentage >= 60 ? 'BUENO' :
                        audit.percentage >= 40 ? 'REGULAR' : 'REQUIERE MEJORA'
      
      const drawBox = (x: number, y: number, width: number, height: number, color: number[], text: string, fontSize: number = 10, bold: boolean = false) => {
        doc.setFillColor(color[0], color[1], color[2])
        doc.roundedRect(x, y, width, height, 2, 2, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.text(text, x + width / 2, y + height / 2 + 2, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }
      
      const drawProgressBar = (x: number, y: number, width: number, height: number, percentage: number, color: number[]) => {
        doc.setFillColor(elegantGray[0], elegantGray[1], elegantGray[2])
        doc.roundedRect(x, y, width, height, 1, 1, 'F')
        const progressWidth = (width * percentage) / 100
        doc.setFillColor(color[0], color[1], color[2])
        doc.roundedRect(x, y, progressWidth, height, 1, 1, 'F')
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.1)
        doc.roundedRect(x, y, width, height, 1, 1, 'S')
      }
      
      let yPos = 15
      const pageWidth = 210
      const margin = 20
      const marginRight = 10
      const textMargin = 5
      const contentWidth = pageWidth - margin - marginRight
      const maxTextWidth = contentWidth - (textMargin * 2)
      
      doc.setFillColor(corporateBlue[0], corporateBlue[1], corporateBlue[2])
      doc.rect(0, 0, pageWidth, 35, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('REPORTE EJECUTIVO', pageWidth / 2, 18, { align: 'center' })
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('AUDITORÍA INFORMÁTICA', pageWidth / 2, 26, { align: 'center' })
      
      doc.setTextColor(0, 0, 0)
      yPos = 40
      
      doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
      doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMACIÓN DE LA AUDITORÍA', margin + contentWidth / 2, yPos + 5.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 12
      
      const infoData = [
        ['Fecha de Realización:', new Date(audit.date).toLocaleDateString('es-ES')],
        ['Fecha y Hora:', new Date(audit.date).toLocaleString('es-ES')],
        ['Área Auditada:', audit.areaName],
        ['Código de Auditoría:', audit.code]
      ]
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      infoData.forEach(([label, value], index) => {
        const rowY = yPos + (index * 7)
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin + textMargin, rowY)
        doc.setFont('helvetica', 'normal')
        const maxLabelWidth = 65
        const valueX = margin + textMargin + maxLabelWidth
        const valueLines = doc.splitTextToSize(value, contentWidth - maxLabelWidth - (textMargin * 2))
        doc.text(valueLines, valueX, rowY, { maxWidth: contentWidth - maxLabelWidth - (textMargin * 2) })
      })
      yPos += 32
      
      const percentageColor = audit.percentage >= 80 ? institutionalGreen :
                              audit.percentage >= 60 ? lightBlue :
                              audit.percentage >= 40 ? [255, 193, 7] : [220, 53, 69]
      
      drawBox(margin, yPos, contentWidth, 20, percentageColor, `${audit.percentage.toFixed(1)}%`, 24, true)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('PORCENTAJE DE CUMPLIMIENTO', pageWidth / 2, yPos + 16, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 25
      
      const boxWidth = (contentWidth - 5) / 2
      
      drawBox(margin, yPos, boxWidth, 15, institutionalGreen, `${passed}`, 16, true)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Preguntas Cumplidas', margin + boxWidth / 2, yPos + 11, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      
      drawBox(margin + boxWidth + 5, yPos, boxWidth, 15, [220, 53, 69], `${failed}`, 16, true)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Preguntas No Cumplidas', margin + boxWidth + 5 + boxWidth / 2, yPos + 11, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 20
      
      doc.setFillColor(elegantGray[0], elegantGray[1], elegantGray[2])
      doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F')
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total de Preguntas Evaluadas: ${total}`, pageWidth / 2, yPos + 7.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 18
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      const progressBarStartX = margin + textMargin
      doc.text('Progreso de Cumplimiento', progressBarStartX, yPos)
      yPos += 6
      
      const progressBarWidth = maxTextWidth - 2
      const progressBarHeight = 8
      drawProgressBar(progressBarStartX, yPos, progressBarWidth, progressBarHeight, audit.percentage, percentageColor)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      const percentageText = `${audit.percentage.toFixed(1)}%`
      const barStartX = progressBarStartX
      const textX = barStartX + (progressBarWidth * audit.percentage) / 100 - (doc.getTextWidth(percentageText) / 2)
      const maxBarEndX = barStartX + progressBarWidth
      if (textX > barStartX && textX + doc.getTextWidth(percentageText) < maxBarEndX) {
        doc.text(percentageText, textX, yPos + 5.5)
      } else {
        doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
        const maxRightX = margin + contentWidth - doc.getTextWidth(percentageText) - 2
        const textAfterBarX = Math.min(barStartX + progressBarWidth + 3, maxRightX)
        doc.text(percentageText, textAfterBarX, yPos + 5.5)
      }
      doc.setTextColor(0, 0, 0)
      yPos += 15
      
      doc.setFillColor(corporateBlue[0], corporateBlue[1], corporateBlue[2])
      doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`EVALUACIÓN: ${evaluation}`, pageWidth / 2, yPos + 6.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 16
      
      doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
      doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('ANÁLISIS DE RESULTADOS', margin + contentWidth / 2, yPos + 5.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 12
      
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      
      const analysisText = generateDynamicAnalysis(audit, passed, total, evaluation)
      
      const analysisMarginRight = 5
      const analysisContentWidth = pageWidth - margin - analysisMarginRight
      const analysisMaxTextWidth = analysisContentWidth - (textMargin * 2)
      const textStartX = margin + textMargin
      const safeTextWidth = analysisMaxTextWidth - 2
      
      const splitWidth = safeTextWidth * 0.85
      let splitText = doc.splitTextToSize(analysisText, splitWidth)
      
      const maxWidthPoints = safeTextWidth * 2.83465
      const splitTextFinal: string[] = []
      const strictWidthPoints = maxWidthPoints * 0.75
      
      splitText.forEach((line: string) => {
        const lineWidthPoints = doc.getTextWidth(line.trim())
        
        if (lineWidthPoints > strictWidthPoints) {
          const words = line.trim().split(/\s+/)
          let currentLine = ''
          
          words.forEach((word: string) => {
            if (!word.trim()) return
            
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const testWidthPoints = doc.getTextWidth(testLine)
            
            if (testWidthPoints <= strictWidthPoints) {
              currentLine = testLine
            } else {
              if (currentLine.trim()) {
                splitTextFinal.push(currentLine.trim())
              }
              
              const wordWidth = doc.getTextWidth(word)
              if (wordWidth > maxWidthPoints * 0.75) {
                splitTextFinal.push(word)
                currentLine = ''
              } else {
                currentLine = word
              }
            }
          })
          
          if (currentLine.trim()) {
            splitTextFinal.push(currentLine.trim())
          }
        } else {
          splitTextFinal.push(line.trim())
        }
      })
      
      let currentY = yPos
      const lineHeight = 4.5
      const maxY = 245
      
      splitTextFinal.forEach((line: string) => {
        if (currentY + lineHeight > maxY) {
          doc.addPage()
          currentY = 25
        }
        
        const finalLineWidth = doc.getTextWidth(line)
        
        if (finalLineWidth > maxWidthPoints * 0.85) {
          doc.text(line, textStartX, currentY, { 
            maxWidth: safeTextWidth,
            align: 'left'
          })
        } else {
          doc.text(line, textStartX, currentY, { 
            maxWidth: safeTextWidth,
            align: 'justify'
          })
        }
        currentY += lineHeight
      })
      
      const totalPages = doc.internal.pages.length - 1
      const footerY = 270
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.line(margin, footerY - 3, pageWidth - marginRight, footerY - 3)
        
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        
        if (i === totalPages) {
          const footerTextLeft = 'Generado el ' + new Date().toLocaleString('es-ES')
          const footerTextRight = 'Sistema de Auditoría Informática'
          
          const leftTextWidth = doc.getTextWidth(footerTextLeft)
          const rightTextWidth = doc.getTextWidth(footerTextRight)
          const availableWidth = (contentWidth - (textMargin * 2)) / 2
          
          if (leftTextWidth <= availableWidth) {
            doc.text(footerTextLeft, margin + textMargin, footerY + 3)
          } else {
            const leftLines = doc.splitTextToSize(footerTextLeft, availableWidth)
            doc.text(leftLines, margin + textMargin, footerY + 3, { maxWidth: availableWidth })
          }
          
          if (rightTextWidth <= availableWidth) {
            doc.text(footerTextRight, pageWidth - marginRight - textMargin, footerY + 3, { align: 'right' })
          } else {
            const rightLines = doc.splitTextToSize(footerTextRight, availableWidth)
            doc.text(rightLines, pageWidth - marginRight - textMargin, footerY + 3, { align: 'right', maxWidth: availableWidth })
          }
        }
        
        doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, footerY + 3, { align: 'center' })
      }
      
      doc.setTextColor(0, 0, 0)
      doc.save(`resumen_ejecutivo_${audit.code}_${Date.now()}.pdf`)
    })
  }
  
  // Función para generar PDF Detallado (reutilizar lógica de DetailedSummary)
  const generateDetailedPDF = (audit: any) => {
    return import('jspdf').then((jsPDFModule: any) => {
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF || jsPDFModule
      const doc = new jsPDF('portrait', 'mm', 'a4')
      
      const corporateBlue = [10, 61, 98]
      const lightBlue = [60, 141, 188]
      const institutionalGreen = [40, 167, 69]
      const darkGray = [44, 62, 80]
      const elegantGray = [229, 229, 229]
      
      const passed = audit.questions.filter((q: any) => {
        const answerData = audit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        return answerValue
      }).length
      const total = audit.questions.length
      const failed = total - passed
      const evaluation = audit.percentage >= 80 ? 'EXCELENTE' : 
                        audit.percentage >= 60 ? 'BUENO' :
                        audit.percentage >= 40 ? 'REGULAR' : 'REQUIERE MEJORA'
      
      const failedQuestions = audit.questions.filter((q: any) => {
        const answerData = audit.answers[q.id]
        const answerValue = typeof answerData === 'object' ? answerData?.value : answerData
        return !answerValue
      }).map((q: any) => {
        const answerData = audit.answers[q.id]
        const observation = typeof answerData === 'object' ? (answerData?.observation || '') : ''
        return {
          ...q,
          code: q.code || audit.code || 'N/A',
          observation
        }
      })
      
      const drawBox = (x: number, y: number, width: number, height: number, color: number[], text: string, fontSize: number = 10, bold: boolean = false) => {
        doc.setFillColor(color[0], color[1], color[2])
        doc.roundedRect(x, y, width, height, 2, 2, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.text(text, x + width / 2, y + height / 2 + 2, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }
      
      const drawProgressBar = (x: number, y: number, width: number, height: number, percentage: number, color: number[]) => {
        doc.setFillColor(elegantGray[0], elegantGray[1], elegantGray[2])
        doc.roundedRect(x, y, width, height, 1, 1, 'F')
        const progressWidth = (width * percentage) / 100
        doc.setFillColor(color[0], color[1], color[2])
        doc.roundedRect(x, y, progressWidth, height, 1, 1, 'F')
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.1)
        doc.roundedRect(x, y, width, height, 1, 1, 'S')
      }
      
      let yPos = 15
      const pageWidth = 210
      const margin = 20
      const marginRight = 10
      const textMargin = 5
      const contentWidth = pageWidth - margin - marginRight
      const maxTextWidth = contentWidth - (textMargin * 2)
      
      doc.setFillColor(corporateBlue[0], corporateBlue[1], corporateBlue[2])
      doc.rect(0, 0, pageWidth, 35, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('REPORTE DETALLADO', pageWidth / 2, 18, { align: 'center' })
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('AUDITORÍA INFORMÁTICA', pageWidth / 2, 26, { align: 'center' })
      
      doc.setTextColor(0, 0, 0)
      yPos = 40
      
      doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
      doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMACIÓN DE LA AUDITORÍA', margin + contentWidth / 2, yPos + 5.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 12
      
      const infoData = [
        ['Fecha de Realización:', new Date(audit.date).toLocaleDateString('es-ES')],
        ['Fecha y Hora:', new Date(audit.date).toLocaleString('es-ES')],
        ['Área Auditada:', audit.areaName],
        ['Código de Auditoría:', audit.code]
      ]
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      infoData.forEach(([label, value], index) => {
        const rowY = yPos + (index * 7)
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin + textMargin, rowY)
        doc.setFont('helvetica', 'normal')
        const maxLabelWidth = 65
        const valueX = margin + textMargin + maxLabelWidth
        const valueLines = doc.splitTextToSize(value, contentWidth - maxLabelWidth - (textMargin * 2))
        doc.text(valueLines, valueX, rowY, { maxWidth: contentWidth - maxLabelWidth - (textMargin * 2) })
      })
      yPos += 32
      
      const percentageColor = audit.percentage >= 80 ? institutionalGreen :
                              audit.percentage >= 60 ? lightBlue :
                              audit.percentage >= 40 ? [255, 193, 7] : [220, 53, 69]
      
      drawBox(margin, yPos, contentWidth, 20, percentageColor, `${audit.percentage.toFixed(1)}%`, 24, true)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('PORCENTAJE DE CUMPLIMIENTO', pageWidth / 2, yPos + 16, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 25
      
      const boxWidth = (contentWidth - 5) / 2
      
      drawBox(margin, yPos, boxWidth, 15, institutionalGreen, `${passed}`, 16, true)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Preguntas Cumplidas', margin + boxWidth / 2, yPos + 11, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      
      drawBox(margin + boxWidth + 5, yPos, boxWidth, 15, [220, 53, 69], `${failed}`, 16, true)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Preguntas No Cumplidas', margin + boxWidth + 5 + boxWidth / 2, yPos + 11, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 20
      
      doc.setFillColor(elegantGray[0], elegantGray[1], elegantGray[2])
      doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F')
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total de Preguntas Evaluadas: ${total}`, pageWidth / 2, yPos + 7.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 18
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      const progressBarStartX = margin + textMargin
      doc.text('Progreso de Cumplimiento', progressBarStartX, yPos)
      yPos += 6
      
      const progressBarWidth = maxTextWidth - 2
      const progressBarHeight = 8
      drawProgressBar(progressBarStartX, yPos, progressBarWidth, progressBarHeight, audit.percentage, percentageColor)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      const percentageText = `${audit.percentage.toFixed(1)}%`
      const barStartX = progressBarStartX
      const textX = barStartX + (progressBarWidth * audit.percentage) / 100 - (doc.getTextWidth(percentageText) / 2)
      const maxBarEndX = barStartX + progressBarWidth
      if (textX > barStartX && textX + doc.getTextWidth(percentageText) < maxBarEndX) {
        doc.text(percentageText, textX, yPos + 5.5)
      } else {
        doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
        const maxRightX = margin + contentWidth - doc.getTextWidth(percentageText) - 2
        const textAfterBarX = Math.min(barStartX + progressBarWidth + 3, maxRightX)
        doc.text(percentageText, textAfterBarX, yPos + 5.5)
      }
      doc.setTextColor(0, 0, 0)
      yPos += 15
      
      doc.setFillColor(corporateBlue[0], corporateBlue[1], corporateBlue[2])
      doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`EVALUACIÓN: ${evaluation}`, pageWidth / 2, yPos + 6.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 16
      
      doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
      doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('ANÁLISIS DETALLADO DE RESULTADOS', margin + contentWidth / 2, yPos + 5.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 12
      
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      
      const analysisText = generateDetailedAnalysis(audit, passed, total, evaluation)
      
      const analysisMarginRight = 5
      const analysisContentWidth = pageWidth - margin - analysisMarginRight
      const analysisMaxTextWidth = analysisContentWidth - (textMargin * 2)
      const textStartX = margin + textMargin
      const safeTextWidth = analysisMaxTextWidth - 2
      
      const splitWidth = safeTextWidth * 0.85
      let splitText = doc.splitTextToSize(analysisText, splitWidth)
      
      const maxWidthPoints = safeTextWidth * 2.83465
      const splitTextFinal: string[] = []
      const strictWidthPoints = maxWidthPoints * 0.75
      
      splitText.forEach((line: string) => {
        const lineWidthPoints = doc.getTextWidth(line.trim())
        
        if (lineWidthPoints > strictWidthPoints) {
          const words = line.trim().split(/\s+/)
          let currentLine = ''
          
          words.forEach((word: string) => {
            if (!word.trim()) return
            
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const testWidthPoints = doc.getTextWidth(testLine)
            
            if (testWidthPoints <= strictWidthPoints) {
              currentLine = testLine
            } else {
              if (currentLine.trim()) {
                splitTextFinal.push(currentLine.trim())
              }
              
              const wordWidth = doc.getTextWidth(word)
              if (wordWidth > maxWidthPoints * 0.75) {
                splitTextFinal.push(word)
                currentLine = ''
              } else {
                currentLine = word
              }
            }
          })
          
          if (currentLine.trim()) {
            splitTextFinal.push(currentLine.trim())
          }
        } else {
          splitTextFinal.push(line.trim())
        }
      })
      
      let currentY = yPos
      const lineHeight = 4.5
      const maxY = 245
      
      splitTextFinal.forEach((line: string) => {
        if (currentY + lineHeight > maxY) {
          doc.addPage()
          currentY = 25
        }
        
        const finalLineWidth = doc.getTextWidth(line)
        
        if (finalLineWidth > maxWidthPoints * 0.85) {
          doc.text(line, textStartX, currentY, { 
            maxWidth: safeTextWidth,
            align: 'left'
          })
        } else {
          doc.text(line, textStartX, currentY, { 
            maxWidth: safeTextWidth,
            align: 'justify'
          })
        }
        currentY += lineHeight
      })
      
      yPos = currentY + 8
      
      if (failedQuestions.length > 0) {
        if (yPos > maxY - 30) {
          doc.addPage()
          yPos = 25
        }
        
        doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
        doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('FALLAS Y FALENCIAS IDENTIFICADAS', margin + contentWidth / 2, yPos + 5.5, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        yPos += 12
        
        const sortedFailures = [...failedQuestions].sort((a: any, b: any) => b.severity - a.severity)
        
        const highSeverityFailures = sortedFailures.filter((q: any) => q.severity >= 8)
        const mediumSeverityFailures = sortedFailures.filter((q: any) => q.severity >= 5 && q.severity < 8)
        const lowSeverityFailures = sortedFailures.filter((q: any) => q.severity < 5)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        
        if (highSeverityFailures.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
          doc.text('Fallas de Alta Criticidad (Severidad mayor o igual a 8):', margin + textMargin, yPos)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          yPos += 7
          
          highSeverityFailures.forEach((failure: any, index: number) => {
            if (yPos > maxY - 20) {
              doc.addPage()
              yPos = 25
            }
            
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            const failureTitle = `${index + 1}. ${failure.text}`
            const titleLines = doc.splitTextToSize(failureTitle, safeTextWidth)
            doc.text(titleLines, textStartX, yPos, { maxWidth: safeTextWidth })
            yPos += (titleLines.length * 4.5)
            
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(100, 100, 100)
            doc.text(`Código: ${failure.code || 'N/A'} | Severidad: ${failure.severity}`, textStartX, yPos)
            yPos += 5
            
            if (failure.observation && failure.observation.trim()) {
              doc.setTextColor(0, 0, 0)
              doc.setFont('helvetica', 'italic')
              doc.setFontSize(8)
              const observationLines = doc.splitTextToSize(`Observación: ${failure.observation}`, safeTextWidth - 5)
              doc.text(observationLines, textStartX + 2, yPos, { maxWidth: safeTextWidth - 5 })
              yPos += (observationLines.length * 4)
            }
            
            yPos += 4
            doc.setTextColor(0, 0, 0)
          })
          
          yPos += 5
        }
        
        if (mediumSeverityFailures.length > 0) {
          if (yPos > maxY - 25) {
            doc.addPage()
            yPos = 25
          }
          
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
          doc.text('Fallas de Severidad Media (Severidad 5-7):', margin + textMargin, yPos)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          yPos += 7
          
          mediumSeverityFailures.forEach((failure: any, index: number) => {
            if (yPos > maxY - 20) {
              doc.addPage()
              yPos = 25
            }
            
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            const failureTitle = `${index + 1}. ${failure.text}`
            const titleLines = doc.splitTextToSize(failureTitle, safeTextWidth)
            doc.text(titleLines, textStartX, yPos, { maxWidth: safeTextWidth })
            yPos += (titleLines.length * 4.5)
            
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(100, 100, 100)
            doc.text(`Código: ${failure.code || 'N/A'} | Severidad: ${failure.severity}`, textStartX, yPos)
            yPos += 5
            
            if (failure.observation && failure.observation.trim()) {
              doc.setTextColor(0, 0, 0)
              doc.setFont('helvetica', 'italic')
              doc.setFontSize(8)
              const observationLines = doc.splitTextToSize(`Observación: ${failure.observation}`, safeTextWidth - 5)
              doc.text(observationLines, textStartX + 2, yPos, { maxWidth: safeTextWidth - 5 })
              yPos += (observationLines.length * 4)
            }
            
            yPos += 4
            doc.setTextColor(0, 0, 0)
          })
          
          yPos += 5
        }
        
        if (lowSeverityFailures.length > 0) {
          if (yPos > maxY - 25) {
            doc.addPage()
            yPos = 25
          }
          
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
          doc.text('Fallas de Baja Severidad (Severidad < 5):', margin + textMargin, yPos)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          yPos += 7
          
          lowSeverityFailures.forEach((failure: any, index: number) => {
            if (yPos > maxY - 20) {
              doc.addPage()
              yPos = 25
            }
            
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            const failureTitle = `${index + 1}. ${failure.text}`
            const titleLines = doc.splitTextToSize(failureTitle, safeTextWidth)
            doc.text(titleLines, textStartX, yPos, { maxWidth: safeTextWidth })
            yPos += (titleLines.length * 4.5)
            
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(100, 100, 100)
            doc.text(`Código: ${failure.code || 'N/A'} | Severidad: ${failure.severity}`, textStartX, yPos)
            yPos += 5
            
            if (failure.observation && failure.observation.trim()) {
              doc.setTextColor(0, 0, 0)
              doc.setFont('helvetica', 'italic')
              doc.setFontSize(8)
              const observationLines = doc.splitTextToSize(`Observación: ${failure.observation}`, safeTextWidth - 5)
              doc.text(observationLines, textStartX + 2, yPos, { maxWidth: safeTextWidth - 5 })
              yPos += (observationLines.length * 4)
            }
            
            yPos += 4
            doc.setTextColor(0, 0, 0)
          })
        }
      }
      
      const totalPages = doc.internal.pages.length - 1
      const footerY = 270
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.line(margin, footerY - 3, pageWidth - marginRight, footerY - 3)
        
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        
        if (i === totalPages) {
          const footerTextLeft = 'Generado el ' + new Date().toLocaleString('es-ES')
          const footerTextRight = 'Sistema de Auditoría Informática'
          
          const leftTextWidth = doc.getTextWidth(footerTextLeft)
          const rightTextWidth = doc.getTextWidth(footerTextRight)
          const availableWidth = (contentWidth - (textMargin * 2)) / 2
          
          if (leftTextWidth <= availableWidth) {
            doc.text(footerTextLeft, margin + textMargin, footerY + 3)
          } else {
            const leftLines = doc.splitTextToSize(footerTextLeft, availableWidth)
            doc.text(leftLines, margin + textMargin, footerY + 3, { maxWidth: availableWidth })
          }
          
          if (rightTextWidth <= availableWidth) {
            doc.text(footerTextRight, pageWidth - marginRight - textMargin, footerY + 3, { align: 'right' })
          } else {
            const rightLines = doc.splitTextToSize(footerTextRight, availableWidth)
            doc.text(rightLines, pageWidth - marginRight - textMargin, footerY + 3, { align: 'right', maxWidth: availableWidth })
          }
        }
        
        doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, footerY + 3, { align: 'center' })
      }
      
      doc.save(`resumen_detallado_${audit.code}_${Date.now()}.pdf`)
    })
  }
  
  // Función principal que genera los 3 reportes
  const generateAllReports = async () => {
    if (!selectedAudit) {
      alert('Por favor seleccione una auditoría')
      return
    }
    
    setIsGenerating(true)
    
    try {
      await exportExcelResponses(selectedAudit)
      await generateExecutivePDF(selectedAudit)
      await generateDetailedPDF(selectedAudit)
      
      alert('Todos los reportes se han generado exitosamente')
    } catch (error) {
      console.error('Error al generar reportes:', error)
      alert('Ocurrió un error al generar los reportes. Por favor, intente nuevamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-pure-white p-6 rounded-lg shadow-md border border-elegant-gray">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-dark-gray">Auditoría Completa</h2>
          <button
            onClick={onBack}
            className="bg-dark-gray text-pure-white px-4 py-2 rounded hover:bg-opacity-90 transition"
          >
            Volver
          </button>
        </div>
        <div className="space-y-4">
          {/* Filtro por área */}
          <div>
            <label className="block text-sm font-medium mb-2 text-dark-gray">Filtrar por Área (Opcional)</label>
            <select
              value={selectedAreaFilter || ''}
              onChange={(e) => setSelectedAreaFilter(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-light-blue rounded bg-elegant-gray text-dark-gray focus:outline-none focus:ring-2 focus:ring-light-blue"
            >
              <option value="">Todas las áreas</option>
              {areas.map((area: any) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
            {selectedAreaFilter && (
              <p className="text-sm text-institutional-green mt-1">
                Mostrando {filteredAudits.length} auditoría(s) de {areas.find((a: any) => a.id === selectedAreaFilter)?.name}
              </p>
            )}
          </div>
          
          <p className="text-dark-gray opacity-70">
            Seleccione una auditoría para generar todos los reportes: Excel de respuestas, Resumen Ejecutivo PDF y Resumen Detallado PDF
          </p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {sortedAudits.map((audit: any) => (
              <div
                key={audit.id}
                onClick={() => setSelectedAudit(audit)}
                className={`p-3 border rounded cursor-pointer transition ${
                  selectedAudit?.id === audit.id
                    ? 'bg-light-blue border-light-blue text-pure-white'
                    : 'bg-pure-white border-elegant-gray hover:bg-elegant-gray text-dark-gray'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{audit.areaName}</span>
                  <span className="text-sm opacity-90">{audit.percentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm opacity-70 mt-1">
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
            onClick={generateAllReports}
            disabled={!selectedAudit || isGenerating}
            className="bg-institutional-green text-pure-white px-6 py-2 rounded hover:bg-opacity-90 disabled:bg-elegant-gray disabled:text-dark-gray disabled:cursor-not-allowed transition w-full"
          >
            {isGenerating ? 'Generando reportes...' : 'Generar Todos los Reportes (Excel + PDF Ejecutivo + PDF Detallado)'}
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
      <h3 className="font-bold mb-3 text-dark-gray">Preguntas Existentes ({questions.length})</h3>
      
      {/* Dropdown para filtrar por código */}
      <div className="relative mb-4">
        <label className="block text-sm font-medium mb-2 text-dark-gray">Filtrar por Código</label>
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
            className="w-full px-4 py-2 border border-light-blue rounded bg-elegant-gray text-dark-gray placeholder-dark-gray placeholder-opacity-50 focus:outline-none focus:ring-2 focus:ring-light-blue"
          />
          {showCodeDropdown && uniqueCodes.length > 0 && (
            <>
              <div className="absolute z-10 w-full mt-1 bg-pure-white border border-elegant-gray rounded max-h-48 overflow-y-auto shadow-lg">
                <div
                  onClick={() => {
                    setSelectedCode('')
                    setShowCodeDropdown(false)
                  }}
                  className="px-4 py-2 cursor-pointer hover:bg-light-blue hover:text-pure-white text-dark-gray text-sm transition"
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
                    className="px-4 py-2 cursor-pointer hover:bg-light-blue hover:text-pure-white text-dark-gray text-sm flex justify-between items-center transition"
                  >
                    <span>{item.code}</span>
                    <span className="opacity-70 text-xs">{item.count} pregunta{item.count !== 1 ? 's' : ''}</span>
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
          <div key={q.id} className="p-4 border border-elegant-gray rounded bg-pure-white hover:bg-elegant-gray transition">
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
                      <span className="font-semibold text-dark-gray text-sm">[{q.code}]</span>
                      <span className="text-dark-gray opacity-70 text-xs">Severidad: {q.severity}</span>
                    </div>
                    <p className="text-dark-gray">{q.text}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="bg-light-blue text-pure-white px-3 py-1 rounded text-sm hover:bg-opacity-90 transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDeleteQuestion(q.id)}
                    className="bg-red-600 text-pure-white px-3 py-1 rounded text-sm hover:bg-red-700 transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filteredQuestions.length === 0 && (
          <p className="text-dark-gray opacity-70 text-center py-4">No hay preguntas para mostrar</p>
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
        <label className="block text-xs text-dark-gray mb-1">Texto de la pregunta</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3 py-2 border border-light-blue rounded bg-pure-white text-dark-gray focus:outline-none focus:ring-2 focus:ring-light-blue"
          rows={2}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-dark-gray mb-1">Código</label>
          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setShowCodeDropdown(true)
              }}
              onFocus={() => setShowCodeDropdown(true)}
              className="w-full px-3 py-2 border border-light-blue rounded bg-pure-white text-dark-gray text-sm focus:outline-none focus:ring-2 focus:ring-light-blue"
            />
            {showCodeDropdown && uniqueCodes.length > 0 && (
              <>
                <div className="absolute z-10 w-full mt-1 bg-pure-white border border-elegant-gray rounded max-h-32 overflow-y-auto shadow-lg">
                  {uniqueCodes.filter(item => item.code.toLowerCase().includes(code.toLowerCase())).map((item: any) => (
                    <div
                      key={item.code}
                      onClick={() => {
                        setCode(item.code)
                        setShowCodeDropdown(false)
                      }}
                      className="px-3 py-2 cursor-pointer hover:bg-light-blue hover:text-pure-white text-dark-gray text-xs transition"
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
          <label className="block text-xs text-dark-gray mb-1">Severidad (1-10)</label>
          <input
            type="number"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            min="1"
            max="10"
            className="w-full px-3 py-2 border border-light-blue rounded bg-pure-white text-dark-gray text-sm focus:outline-none focus:ring-2 focus:ring-light-blue"
          />
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="bg-institutional-green text-pure-white px-4 py-2 rounded text-sm hover:bg-opacity-90 transition"
        >
          Guardar
        </button>
        <button
          onClick={onCancel}
          className="bg-dark-gray text-pure-white px-4 py-2 rounded text-sm hover:bg-opacity-90 transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
