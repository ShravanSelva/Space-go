require "webrick"

root = "/Users/shravan/.gemini/antigravity/scratch/space-mission-designer"

server = WEBrick::HTTPServer.new(
  :Port => 8080,
  :BindAddress => "0.0.0.0",
  :AccessLog => [],
  :Logger => WEBrick::Log.new($stderr, WEBrick::Log::INFO)
)

server.mount_proc "/" do |req, res|
  rel_path = req.path == "/" ? "/index.html" : req.path
  # Normalize and prevent directory traversal
  clean_path = File.expand_path(File.join(root, rel_path))
  
  if clean_path.start_with?(root) && File.file?(clean_path)
    res.status = 200
    res["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    res["Pragma"] = "no-cache"
    ext = File.extname(clean_path).downcase
    res["Content-Type"] = case ext
      when ".html" then "text/html; charset=utf-8"
      when ".css"  then "text/css; charset=utf-8"
      when ".js"   then "application/javascript; charset=utf-8"
      when ".svg"  then "image/svg+xml"
      when ".json" then "application/json"
      when ".ico"  then "image/x-icon"
      when ".png"  then "image/png"
      else "text/plain"
    end
    # Reading into Ruby String avoids macOS sandbox sendfile(2) EPERM errors
    res.body = File.binread(clean_path)
  else
    res.status = 404
    res.body = "File not found"
  end
end

trap("INT") { server.shutdown }
trap("TERM") { server.shutdown }

server.start
