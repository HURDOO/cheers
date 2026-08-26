import AppKit
import CoreText
import Foundation

struct OverlaySpec: Decodable {
    let width: Int
    let height: Int
    let fontPath: String?
    let items: [OverlayItem]
}

struct OverlayItem: Decodable {
    let filePath: String
    let kind: String
    let text: String
}

guard CommandLine.arguments.count == 2 else {
    FileHandle.standardError.write(Data("사용법: swift render-reel-overlays.swift <spec.json>\n".utf8))
    exit(1)
}

let specURL = URL(fileURLWithPath: CommandLine.arguments[1])
let spec = try JSONDecoder().decode(OverlaySpec.self, from: Data(contentsOf: specURL))
if let fontPath = spec.fontPath {
    CTFontManagerRegisterFontsForURL(URL(fileURLWithPath: fontPath) as CFURL, .process, nil)
}

for item in spec.items {
    let image = NSImage(size: NSSize(width: spec.width, height: spec.height))
    image.lockFocus()
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: spec.width, height: spec.height).fill()
    draw(item: item, width: CGFloat(spec.width), height: CGFloat(spec.height))
    image.unlockFocus()

    guard let tiff = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiff),
          let png = bitmap.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "CheersOverlay", code: 1, userInfo: [NSLocalizedDescriptionKey: "PNG 레이어를 만들지 못했습니다."])
    }
    try png.write(to: URL(fileURLWithPath: item.filePath), options: .atomic)
}

func draw(item: OverlayItem, width: CGFloat, height: CGFloat) {
    let layout = overlayLayout(kind: item.kind, width: width, height: height)
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = layout.alignment
    paragraph.lineBreakMode = .byWordWrapping
    paragraph.lineSpacing = layout.lineSpacing

    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.85)
    shadow.shadowBlurRadius = layout.shadowBlur
    shadow.shadowOffset = NSSize(width: 0, height: -2)

    let font = NSFont(name: "Pretendard", size: layout.fontSize)
        ?? NSFont(name: "Apple SD Gothic Neo", size: layout.fontSize)
        ?? NSFont.systemFont(ofSize: layout.fontSize, weight: layout.weight)
    let attributes: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: layout.color,
        .paragraphStyle: paragraph,
        .strokeColor: NSColor.black,
        .strokeWidth: 0,
        .shadow: shadow,
    ]

    if item.kind == "source" {
        let measured = (item.text as NSString).boundingRect(
            with: NSSize(width: layout.rect.width - 30, height: layout.rect.height),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            attributes: attributes
        )
        let background = NSRect(
            x: layout.rect.minX - 16,
            y: layout.rect.maxY - measured.height - 18,
            width: min(layout.rect.width, measured.width + 32),
            height: measured.height + 18
        )
        NSColor.black.withAlphaComponent(0.56).setFill()
        NSBezierPath(roundedRect: background, xRadius: 12, yRadius: 12).fill()
    }

    let outlineAttributes = attributes.merging([.foregroundColor: NSColor.black, .shadow: NSShadow()]) { _, new in new }
    let outline: CGFloat = item.kind == "source" ? 2 : 5
    let offsets = [
        NSPoint(x: -outline, y: 0), NSPoint(x: outline, y: 0),
        NSPoint(x: 0, y: -outline), NSPoint(x: 0, y: outline),
        NSPoint(x: -outline, y: -outline), NSPoint(x: -outline, y: outline),
        NSPoint(x: outline, y: -outline), NSPoint(x: outline, y: outline),
    ]
    for offset in offsets {
        (item.text as NSString).draw(
            with: layout.rect.offsetBy(dx: offset.x, dy: offset.y),
            options: [.usesLineFragmentOrigin, .usesFontLeading, .truncatesLastVisibleLine],
            attributes: outlineAttributes
        )
    }
    (item.text as NSString).draw(with: layout.rect, options: [.usesLineFragmentOrigin, .usesFontLeading, .truncatesLastVisibleLine], attributes: attributes)
}

func overlayLayout(kind: String, width: CGFloat, height: CGFloat) -> (
    rect: NSRect,
    fontSize: CGFloat,
    weight: NSFont.Weight,
    color: NSColor,
    alignment: NSTextAlignment,
    lineSpacing: CGFloat,
    strokeWidth: CGFloat,
    shadowBlur: CGFloat
) {
    switch kind {
    case "source":
        return (NSRect(x: 48, y: height - 150, width: width - 96, height: 76), 29, .medium, .white, .left, 2, -2.4, 5)
    case "hook":
        return (NSRect(x: 72, y: height - 430, width: width - 144, height: 230), 72, .heavy, .white, .center, 7, -5.2, 10)
    case "headline":
        return (NSRect(x: 76, y: 480, width: width - 152, height: 180), 57, .bold, NSColor(calibratedRed: 0.86, green: 0.94, blue: 1, alpha: 1), .center, 5, -4.2, 8)
    case "lyrics":
        return (NSRect(x: 76, y: 235, width: width - 152, height: 220), 68, .heavy, .white, .center, 8, -5.4, 10)
    default:
        return (NSRect(x: 76, y: 80, width: width - 152, height: 150), 55, .bold, .white, .center, 6, -4.5, 9)
    }
}
