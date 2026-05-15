param(
  [string]$Uri = 'ws://127.0.0.1:10002',
  [string]$Username = 'User',
  [string]$LogPath = ''
)

$ErrorActionPreference = 'Stop'

if (-not $LogPath) {
  $LogPath = Join-Path $env:TEMP 'fay10002_probe.log'
}

function Write-Log {
  param([string]$Message)
  $timestamp = Get-Date -Format o
  Add-Content -Path $LogPath -Value "$timestamp $Message"
}

function Send-Json {
  param(
    [System.Net.WebSockets.ClientWebSocket]$Socket,
    [string]$Json
  )

  $bytes = [Text.Encoding]::UTF8.GetBytes($Json)
  $segment = [ArraySegment[byte]]::new($bytes)
  $Socket.SendAsync(
    $segment,
    [System.Net.WebSockets.WebSocketMessageType]::Text,
    $true,
    [Threading.CancellationToken]::None
  ).GetAwaiter().GetResult()
  Write-Log "SENT $Json"
}

$socket = [System.Net.WebSockets.ClientWebSocket]::new()

try {
  Set-Content -Path $LogPath -Value ''
  Write-Log "CONNECTING $Uri"

  $socket.ConnectAsync(
    [Uri]$Uri,
    [Threading.CancellationToken]::None
  ).GetAwaiter().GetResult()

  Write-Log 'CONNECTED'

  Send-Json -Socket $socket -Json (@{ Topic = 'Username'; Data = $Username } | ConvertTo-Json -Compress)
  Send-Json -Socket $socket -Json (@{ Topic = 'Output'; Data = $true } | ConvertTo-Json -Compress)

  $buffer = New-Object byte[] 32768

  while ($socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
    $stream = New-Object System.IO.MemoryStream
    try {
      do {
        $segment = [ArraySegment[byte]]::new($buffer)
        $result = $socket.ReceiveAsync(
          $segment,
          [Threading.CancellationToken]::None
        ).GetAwaiter().GetResult()

        if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
          Write-Log 'CLOSED_BY_SERVER'
          $socket.CloseAsync(
            [System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure,
            'bye',
            [Threading.CancellationToken]::None
          ).GetAwaiter().GetResult()
          break
        }

        if ($result.Count -gt 0) {
          $stream.Write($buffer, 0, $result.Count)
        }
      } until ($result.EndOfMessage)

      if ($stream.Length -gt 0) {
        $text = [Text.Encoding]::UTF8.GetString($stream.ToArray())
        Write-Log "RECV $text"
      }
    }
    finally {
      $stream.Dispose()
    }
  }
}
catch {
  Write-Log "ERROR $($_.Exception.Message)"
  throw
}
finally {
  $socket.Dispose()
}
