$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = Split-Path $PSScriptRoot -Parent
$source = Join-Path $root '外教法语课分类复习手册.docx'
$zip = [IO.Compression.ZipFile]::OpenRead($source)
try {
  $reader = New-Object IO.StreamReader($zip.GetEntry('word/document.xml').Open())
  try { [xml]$xml = $reader.ReadToEnd() } finally { $reader.Dispose() }
} finally { $zip.Dispose() }
$ns = New-Object Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main')
$blocks = @()
$i = 0
foreach ($node in $xml.SelectNodes('//w:body/*',$ns)) {
  $i++
  if ($node.LocalName -eq 'p') {
    $text = ($node.SelectNodes('.//w:t',$ns) | ForEach-Object {$_.InnerText}) -join ''
    if ($text) { $blocks += [pscustomobject]@{index=$i;type='paragraph';text=$text} }
  } elseif ($node.LocalName -eq 'tbl') {
    $rows = @()
    $j = 0
    foreach ($tr in $node.SelectNodes('./w:tr',$ns)) {
      $j++
      $cells = @(foreach ($tc in $tr.SelectNodes('./w:tc',$ns)) { ($tc.SelectNodes('.//w:t',$ns) | ForEach-Object {$_.InnerText}) -join '' })
      $rows += [pscustomobject]@{row=$j;cells=$cells}
    }
    $blocks += [pscustomobject]@{index=$i;type='table';rows=$rows}
  }
}
$dataDir = Join-Path $root 'data'
[IO.Directory]::CreateDirectory($dataDir) | Out-Null
$utf8 = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $dataDir 'source-extracted.json'),(ConvertTo-Json -InputObject $blocks -Depth 12),$utf8)
$lines = foreach ($b in $blocks) {
  if ($b.type -eq 'paragraph') { 'P'+$b.index+': '+$b.text }
  else { 'TABLE '+$b.index; foreach ($r in $b.rows) { $r.row.ToString()+': '+($r.cells -join ' | ') } }
}
[IO.File]::WriteAllLines((Join-Path $dataDir 'source-extracted.txt'),$lines,$utf8)
Write-Output ('Extracted '+$blocks.Count+' blocks.')
