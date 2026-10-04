param(
  [Parameter(Mandatory=$true)][string]$InputDocx,
  [Parameter(Mandatory=$true)][string]$OutputPdf,
  [switch]$UpdateFields
)

$word = $null
$document = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $readOnly = -not $UpdateFields
  $document = $word.Documents.Open($InputDocx, $false, $readOnly)
  if ($UpdateFields) {
    foreach ($story in $document.StoryRanges) {
      try { $story.Fields.Update() | Out-Null } catch {}
    }
    foreach ($toc in $document.TablesOfContents) {
      try { $toc.Update() } catch {}
    }
    foreach ($tof in $document.TablesOfFigures) {
      try { $tof.Update() } catch {}
    }
    $document.Save()
  }
  $document.ExportAsFixedFormat($OutputPdf, 17)
} finally {
  if ($document -ne $null) { $document.Close($false) }
  if ($word -ne $null) { $word.Quit() }
  if ($document -ne $null) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null }
  if ($word -ne $null) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
