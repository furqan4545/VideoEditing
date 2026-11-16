// Hand pose per frame (Apple Vision), for fingertip tracking. For each JPEG in DIR (sorted): up to 2 hands, with
// wrist, palm (middle MCP), index tip / DIP / PIP / MCP, thumb tip, middle tip, ring tip, little tip: [x, y (from top), conf].
// Also "chir" (left/right as Vision sees it). One JSON line per image.   hands DIR > out.jsonl
import Foundation
import Vision
import AppKit
let dir = CommandLine.arguments[1]
let files = try! FileManager.default.contentsOfDirectory(atPath: dir).filter { $0.hasSuffix(".jpg") }.sorted()
for f in files {
    autoreleasepool {
        let path = dir + "/" + f
        guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return }
        let W = Double(cg.width), H = Double(cg.height)
        let req = VNDetectHumanHandPoseRequest(); req.maximumHandCount = 2
        try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
        var hands: [[String: Any]] = []
        for obs in req.results ?? [] {
            var h: [String: Any] = [:]
            let names: [(String, VNHumanHandPoseObservation.JointName)] = [("wrist", .wrist), ("palm", .middleMCP), ("itip", .indexTip), ("idip", .indexDIP), ("ipip", .indexPIP), ("imcp", .indexMCP), ("thumb", .thumbTip), ("mtip", .middleTip), ("rtip", .ringTip), ("ltip", .littleTip)]
            for (n, j) in names {
                if let p = try? obs.recognizedPoint(j), p.confidence > 0.25 { h[n] = [round(p.location.x * W), round((1 - p.location.y) * H), Double(round(p.confidence * 100) / 100)] }
            }
            h["chir"] = obs.chirality == .left ? "L" : (obs.chirality == .right ? "R" : "?")
            if h.count > 1 { hands.append(h) }
        }
        let data = try! JSONSerialization.data(withJSONObject: ["f": f, "hands": hands])
        print(String(data: data, encoding: .utf8)!)
    }
}
