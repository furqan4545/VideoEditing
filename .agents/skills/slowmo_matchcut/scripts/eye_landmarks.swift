// swift eye_landmarks.swift upright-frames/ > eyes.json
import Foundation
import ImageIO
import Vision

let args = CommandLine.arguments
guard args.count == 2 else {
    FileHandle.standardError.write(Data("Expected a folder of frame images.\n".utf8))
    exit(2)
}
let dir = URL(fileURLWithPath: args[1])
let files = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
let extensions = Set(["jpg", "jpeg", "png", "tif", "tiff", "heic", "heif"])
var records = [String: [[[Double]]]]()
for file in files where extensions.contains(file.pathExtension.lowercased()) {
    try autoreleasepool {
        let options: [CFString: Any] = [kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true, kCGImageSourceThumbnailMaxPixelSize: 960]
        guard let src = CGImageSourceCreateWithURL(file as CFURL, nil),
              let image = CGImageSourceCreateThumbnailAtIndex(src, 0, options as CFDictionary) else { return }
        let request = VNDetectFaceLandmarksRequest()
        try VNImageRequestHandler(cgImage: image).perform([request])
        records[file.lastPathComponent] = (request.results ?? []).compactMap { face in
            guard let left = face.landmarks?.leftEye, let right = face.landmarks?.rightEye,
                  left.pointCount > 0, right.pointCount > 0 else { return nil }
            let box = face.boundingBox
            return [left, right].map { eye in
                let points = eye.normalizedPoints
                let n = Double(points.count)
                return [box.minX + box.width * points.map(\.x).reduce(0,+)/n,
                        1 - box.minY - box.height * points.map(\.y).reduce(0,+)/n]
            }
        }
    }
}
let json = try JSONSerialization.data(withJSONObject: records, options: [.sortedKeys])
FileHandle.standardOutput.write(json)
