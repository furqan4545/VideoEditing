import Foundation
import ImageIO
import Vision

// Input is a sequence of upright JPEGs named by zero-based frame index.
typealias Joint = VNHumanBodyPoseObservation.JointName
typealias Points = [Joint: VNRecognizedPoint]

struct Arm: Encodable {
    let elbowDegrees: Double
    let wrist: [Double]       // Fractions of the frame from the top left.
}

struct Sample: Encodable {
    let seconds: Double
    let left: Arm?
    let right: Arm?
}

func subjectScore(_ joints: Points) -> Double {
    let locations = joints.values.map(\.location)
    let xs = locations.map(\.x), ys = locations.map(\.y)
    guard let x0 = xs.min(), let x1 = xs.max(),
          let y0 = ys.min(), let y1 = ys.max() else { return 0 }
    return (x1 - x0) * (y1 - y0) * Double(joints.count)
}

func measure(_ joints: Points, shoulder: Joint, elbow: Joint, wrist: Joint, aspect: Double) -> Arm? {
    guard let s = joints[shoulder]?.location, let e = joints[elbow]?.location,
          let w = joints[wrist]?.location else { return nil }
    let ux = (s.x - e.x) * aspect, uy = s.y - e.y
    let vx = (w.x - e.x) * aspect, vy = w.y - e.y
    let u = hypot(ux, uy), v = hypot(vx, vy)
    guard min(u, v) > 0.01 else { return nil }
    let cosine = min(1, max(-1, (ux * vx + uy * vy) / (u * v)))
    return Arm(elbowDegrees: acos(cosine) * 180 / .pi, wrist: [w.x, 1 - w.y])
}

func sample(_ url: URL, seconds: Double) throws -> Sample {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        throw NSError(domain: "arm-phase", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "Could not read \(url.lastPathComponent)"])
    }
    let request = VNDetectHumanBodyPoseRequest()
    try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
    let subjects = try (request.results ?? []).map {
        try $0.recognizedPoints(.all).filter { $0.value.confidence >= 0.25 }
    }
    let joints = subjects.max { subjectScore($0) < subjectScore($1) } ?? [:]
    let aspect = Double(image.width) / Double(image.height)
    return Sample(seconds: seconds,
                  left: measure(joints, shoulder: .leftShoulder, elbow: .leftElbow, wrist: .leftWrist, aspect: aspect),
                  right: measure(joints, shoulder: .rightShoulder, elbow: .rightElbow, wrist: .rightWrist, aspect: aspect))
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

let args = CommandLine.arguments
guard args.count == 3, let fps = Double(args[2]), fps.isFinite, fps > 0 else {
    fail("Usage: swift arm-phase.swift FRAME_DIRECTORY SAMPLE_FPS")
}
do {
    let directory = URL(fileURLWithPath: args[1], isDirectory: true)
    let files = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
    let frames = files.filter { ["jpg", "jpeg"].contains($0.pathExtension.lowercased()) }
    guard !frames.isEmpty else { fail("No sampled JPEGs found in \(directory.path)") }
    var samples = [Sample]()
    for frame in frames {
        guard let index = Int(frame.deletingPathExtension().lastPathComponent), index >= 0 else {
            fail("Expected JPEGs named by zero-based frame index, found \(frame.lastPathComponent)")
        }
        let record = try autoreleasepool { try sample(frame, seconds: Double(index) / fps) }
        samples.append(record)
    }
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    let data = try encoder.encode(samples.sorted { $0.seconds < $1.seconds })
    FileHandle.standardOutput.write(data + Data("\n".utf8))
} catch {
    fail(error.localizedDescription)
}
