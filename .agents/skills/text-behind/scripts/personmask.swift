// personmask — a matte of the person (or every foreground subject) for each frame, with Apple's Vision framework.
// Built into macOS (runs on the Neural Engine, nothing downloaded). One frame at a time, low memory.
//   personmask IN_DIR OUT_DIR [--mode person|subject] [--quality accurate|balanced|fast]
// IN_DIR: JPEG/PNG frames (sorted by name). OUT_DIR: one 8-bit grey PNG per frame, same name, same size (white = subject).
import Foundation
import Vision
import CoreImage
import ImageIO

var mode = "person", quality = "accurate"
var pos: [String] = []
var it = CommandLine.arguments.dropFirst().makeIterator()
while let a = it.next() {
    if a == "--mode" { mode = it.next() ?? mode } else if a == "--quality" { quality = it.next() ?? quality } else { pos.append(a) }
}
guard pos.count == 2 else { FileHandle.standardError.write("usage: personmask IN_DIR OUT_DIR [--mode person|subject] [--quality accurate|balanced|fast]\n".data(using: .utf8)!); exit(2) }
let fm = FileManager.default, inDir = URL(fileURLWithPath: pos[0]), outDir = URL(fileURLWithPath: pos[1])
try? fm.createDirectory(at: outDir, withIntermediateDirectories: true)
let files = (try fm.contentsOfDirectory(atPath: inDir.path)).filter { $0.lowercased().hasSuffix(".jpg") || $0.lowercased().hasSuffix(".png") }.sorted()
let ctx = CIContext(options: [.workingColorSpace: NSNull()])
let gray = CGColorSpace(name: CGColorSpace.linearGray)!
var done = 0
for name in files {
    autoreleasepool {
        let url = inDir.appendingPathComponent(name)
        guard let src = CGImageSourceCreateWithURL(url as CFURL, nil), let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return }
        let W = CGFloat(cg.width), H = CGFloat(cg.height)
        let handler = VNImageRequestHandler(cgImage: cg, options: [:])
        var mask: CIImage? = nil
        do {
            if mode == "subject" {
                let req = VNGenerateForegroundInstanceMaskRequest()
                try handler.perform([req])
                if let obs = req.results?.first {
                    let pb = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
                    mask = CIImage(cvPixelBuffer: pb)
                }
            } else {
                let req = VNGeneratePersonSegmentationRequest()
                req.qualityLevel = quality == "fast" ? .fast : quality == "balanced" ? .balanced : .accurate
                req.outputPixelFormat = kCVPixelFormatType_OneComponent8
                try handler.perform([req])
                if let pb = req.results?.first?.pixelBuffer { mask = CIImage(cvPixelBuffer: pb) }
            }
        } catch { FileHandle.standardError.write("\(name): \(error)\n".data(using: .utf8)!) }
        var m = mask ?? CIImage(color: .black).cropped(to: CGRect(x: 0, y: 0, width: W, height: H))
        if m.extent.width != W || m.extent.height != H {
            m = m.transformed(by: CGAffineTransform(scaleX: W / m.extent.width, y: H / m.extent.height))
        }
        let out = outDir.appendingPathComponent((name as NSString).deletingPathExtension + ".png")
        try? ctx.writePNGRepresentation(of: m.cropped(to: CGRect(x: 0, y: 0, width: W, height: H)), to: out, format: .L8, colorSpace: gray)
        done += 1
    }
}
print("\(done) masks → \(outDir.path)")
