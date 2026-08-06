import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AdminApiClient } from '@/lib/adminApi'
import type { BulkMemberInput, BulkMemberSummary } from '@/lib/adminTypes'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const NEW_SEMESTER_SENTINEL = '__new__'

interface ParsedRow {
  firstName: string
  lastName: string
  email: string
  semester: string
}

interface MemberImportDialogProps {
  api: AdminApiClient
  semesterOptions: string[]
  readOnly: boolean
  onImported: () => void | Promise<void>
}

// Tolerant header matching: strip case, spaces, underscores, hyphens.
const normalizeHeader = (header: string): string => header.toLowerCase().replace(/[\s_-]+/g, '')

const FIRST_KEYS = new Set(['firstname', 'first', 'fname', 'givenname'])
const LAST_KEYS = new Set(['lastname', 'last', 'lname', 'surname', 'familyname'])
const EMAIL_KEYS = new Set(['email', 'emailaddress', 'e'])
const SEMESTER_KEYS = new Set(['semester', 'term', 'sem'])
const FULLNAME_KEYS = new Set(['name', 'fullname', 'membername'])

const splitFullName = (value: string): { first: string; last: string } => {
  const parts = value.trim().split(/\s+/)
  if (parts.length === 0) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

const rowIssues = (
  row: ParsedRow,
  knownSemesters: Set<string>,
  effectiveSemester: string
): string[] => {
  const issues: string[] = []
  if (!row.firstName.trim()) issues.push('Missing first name')
  if (!row.lastName.trim()) issues.push('Missing last name')
  if (row.email && !EMAIL_PATTERN.test(row.email)) issues.push('Bad email')
  const semester = row.semester || effectiveSemester
  if (!semester.trim()) issues.push('Missing semester')
  else if (knownSemesters.size > 0 && !knownSemesters.has(semester))
    issues.push('New semester (will be created)')
  return issues
}

export function MemberImportDialog({
  api,
  semesterOptions,
  readOnly,
  onImported,
}: MemberImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [hasSemesterColumn, setHasSemesterColumn] = useState(false)
  const [chosenSemester, setChosenSemester] = useState('')
  const [newSemester, setNewSemester] = useState('')
  const [parseError, setParseError] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const knownSemesters = useMemo(() => new Set(semesterOptions), [semesterOptions])

  const usingNewSemester = chosenSemester === NEW_SEMESTER_SENTINEL
  const effectiveSemester = hasSemesterColumn
    ? ''
    : usingNewSemester
      ? newSemester.trim().toUpperCase()
      : chosenSemester

  const reset = () => {
    setFileName('')
    setRows([])
    setHasSemesterColumn(false)
    setChosenSemester('')
    setNewSemester('')
    setParseError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setParseError('')
    setFileName(file.name)
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) {
        setParseError('The file has no sheets.')
        setRows([])
        return
      }
      const sheet = workbook.Sheets[firstSheetName]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      if (json.length === 0) {
        setParseError('The first sheet has no data rows.')
        setRows([])
        return
      }

      // Build a normalized-header -> original-key map from the first row.
      const headerMap = new Map<string, string>()
      for (const key of Object.keys(json[0])) {
        headerMap.set(normalizeHeader(key), key)
      }
      const findKey = (candidates: Set<string>): string | undefined => {
        for (const [normalized, original] of headerMap) {
          if (candidates.has(normalized)) return original
        }
        return undefined
      }

      const firstKey = findKey(FIRST_KEYS)
      const lastKey = findKey(LAST_KEYS)
      const emailKey = findKey(EMAIL_KEYS)
      const semesterKey = findKey(SEMESTER_KEYS)
      const fullNameKey = findKey(FULLNAME_KEYS)

      if (!firstKey && !lastKey && !fullNameKey) {
        setParseError(
          'Could not find a First Name / Last Name (or a Name) column. Accepted headers: First Name, Last Name, Email, Semester, or a single Name column.'
        )
        setRows([])
        return
      }

      const cell = (row: Record<string, unknown>, key?: string): string =>
        key ? String(row[key] ?? '').trim() : ''

      const parsed: ParsedRow[] = json.map((row) => {
        let firstName = cell(row, firstKey)
        let lastName = cell(row, lastKey)
        if ((!firstName || !lastName) && fullNameKey) {
          const split = splitFullName(cell(row, fullNameKey))
          if (!firstName) firstName = split.first
          if (!lastName) lastName = split.last
        }
        return {
          firstName,
          lastName,
          email: cell(row, emailKey),
          semester: cell(row, semesterKey),
        }
      })

      setHasSemesterColumn(Boolean(semesterKey))
      setRows(parsed)
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse the file.')
      setRows([])
    }
  }

  const validCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          rowIssues(row, knownSemesters, effectiveSemester).filter(
            (issue) => issue !== 'New semester (will be created)'
          ).length === 0
      ).length,
    [rows, knownSemesters, effectiveSemester]
  )

  const needsSemesterChoice = rows.length > 0 && !hasSemesterColumn
  const semesterReady = hasSemesterColumn || effectiveSemester.trim().length > 0
  const canImport = rows.length > 0 && semesterReady && validCount > 0 && !readOnly && !isImporting

  const handleImport = async () => {
    const payload: BulkMemberInput[] = rows
      .map((row) => ({
        first_name: row.firstName.trim(),
        last_name: row.lastName.trim(),
        email: row.email.trim() || null,
        semester: (row.semester || effectiveSemester).trim(),
      }))
      .filter(
        (row) =>
          row.first_name &&
          row.last_name &&
          row.semester &&
          (!row.email || EMAIL_PATTERN.test(row.email))
      )

    if (payload.length === 0) {
      toast.error('No valid rows to import.')
      return
    }

    setIsImporting(true)
    try {
      const summary: BulkMemberSummary = await api.bulkCreateMembers(payload)
      const errorNote = summary.errors.length > 0 ? `, ${summary.errors.length} errored` : ''
      toast.success(
        `Imported ${summary.created} member${summary.created === 1 ? '' : 's'} (${summary.skipped} skipped${errorNote}).`
      )
      setOpen(false)
      reset()
      await onImported()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={readOnly}>
          <Upload data-icon="inline-start" />
          Import .xlsx
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import members from a spreadsheet</DialogTitle>
          <DialogDescription>
            Upload an .xlsx, .xls, or .csv file. Recognized columns: First Name, Last Name, Email,
            and optionally Semester. A single Name column is split into first and last.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="member-import-file">Roster file</Label>
            <Input
              id="member-import-file"
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              disabled={readOnly}
            />
            {fileName ? (
              <p className="text-muted-foreground text-sm">Selected: {fileName}</p>
            ) : null}
            {parseError ? <p className="text-destructive text-sm">{parseError}</p> : null}
          </div>

          {needsSemesterChoice ? (
            <div className="grid gap-2">
              <Label>Target semester (applied to every row)</Label>
              <Select value={chosenSemester} onValueChange={setChosenSemester}>
                <SelectTrigger aria-label="Target semester">
                  <SelectValue placeholder="Choose a semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {semesterOptions.map((semester) => (
                      <SelectItem key={semester} value={semester}>
                        {semester}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_SEMESTER_SENTINEL}>Add a new semester…</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {usingNewSemester ? (
                <Input
                  aria-label="New semester code"
                  placeholder="e.g. F26"
                  value={newSemester}
                  onChange={(event) => setNewSemester(event.target.value)}
                />
              ) : null}
              <p className="text-muted-foreground text-xs">
                A semester that does not exist yet is created automatically on import.
              </p>
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="grid gap-2">
              <p className="text-sm">
                <strong>{rows.length}</strong> row{rows.length === 1 ? '' : 's'} parsed ·{' '}
                <strong>{validCount}</strong> importable
              </p>
              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>First</TableHead>
                      <TableHead>Last</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 100).map((row, index) => {
                      const issues = rowIssues(row, knownSemesters, effectiveSemester)
                      const blocking = issues.filter(
                        (issue) => issue !== 'New semester (will be created)'
                      )
                      return (
                        <TableRow key={index}>
                          <TableCell>{row.firstName || '—'}</TableCell>
                          <TableCell>{row.lastName || '—'}</TableCell>
                          <TableCell>{row.email || '—'}</TableCell>
                          <TableCell>{row.semester || effectiveSemester || '—'}</TableCell>
                          <TableCell>
                            {blocking.length > 0 ? (
                              <span className="text-destructive text-xs">
                                {blocking.join(', ')}
                              </span>
                            ) : issues.length > 0 ? (
                              <span className="text-muted-foreground text-xs">
                                {issues.join(', ')}
                              </span>
                            ) : (
                              <span className="text-xs text-green-600">Ready</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 100 ? (
                <p className="text-muted-foreground text-xs">
                  Showing the first 100 rows; all {rows.length} will be imported.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} disabled={!canImport}>
            {isImporting
              ? 'Importing…'
              : `Import ${validCount} member${validCount === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
