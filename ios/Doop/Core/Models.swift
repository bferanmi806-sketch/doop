import Foundation

public struct DoopUser: Codable, Equatable {
    public var id: String
    public var name: String
    public var email: String
}

public struct CanvasSummary: Codable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var ownerId: String?
    public var shared: Bool?
    public var workspaceId: String?
    public var updatedAt: Double
    public var frameCount: Int
    public var previewFrameId: String?
    public var activeTasks: [CanvasTask]?
}

public struct CanvasDocument: Codable, Identifiable {
    public var id: String
    public var name: String
    public var ownerId: String?
    public var frames: [DesignFrame]
    public var pages: [CanvasPage]?
}

public struct CanvasPage: Codable, Identifiable {
    public var id: String
    public var name: String
}

public struct DesignFrame: Codable, Identifiable, Equatable {
    public var id: String
    public var canvasId: String
    public var name: String
    public var x: Double
    public var y: Double
    public var width: Double
    public var height: Double
    public var html: String
    public var pageId: String?
    public var hidden: Bool?
    public var locked: Bool?
}

/// What a prompt is about: the frame the person had selected when they asked, and
/// the element inside it when one was picked. The agent edits that in place.
/// Mirrors `CardScope` in `shared/types.ts`.
public struct CardScope: Codable, Equatable {
    public var frameId: String
    /// Element selector inside the frame; absent means the whole frame.
    public var selector: String?

    public init(frameId: String, selector: String? = nil) {
        self.frameId = frameId
        self.selector = selector
    }

    /// The `scope` field of a `POST /api/canvases/:id/cards` body.
    public var body: [String: Any] {
        var body: [String: Any] = ["frameId": frameId]
        if let selector { body["selector"] = selector }
        return body
    }
}

/// The resident specialist roles supported by `shared/agents.ts`.
public enum SpecialistAgent: String, CaseIterable, Identifiable, Hashable {
    case ux
    case copy
    case brand
    case a11y
    case polish

    public var id: String { rawValue }

    public var name: String {
        switch self {
        case .ux: return "UX Lead"
        case .copy: return "Copywriter"
        case .brand: return "Brand Compliance"
        case .a11y: return "Accessibility"
        case .polish: return "Visual Polish"
        }
    }

    public var symbol: String {
        switch self {
        case .ux: return "square.grid.2x2"
        case .copy: return "text.quote"
        case .brand: return "paintpalette"
        case .a11y: return "accessibility"
        case .polish: return "sparkles"
        }
    }
}

/// Assignment is local to the composer. Auto omits `agents` so the server
/// keeps its existing default pipeline; a specialist sends one role id.
public enum AgentAssignment: Hashable {
    case automatic
    case specialist(SpecialistAgent)

    public var label: String {
        switch self {
        case .automatic: return "Auto"
        case .specialist(let agent): return agent.name
        }
    }

    public var symbol: String {
        switch self {
        case .automatic: return "sparkles"
        case .specialist(let agent): return agent.symbol
        }
    }

    public var agentIDs: [String]? {
        guard case .specialist(let agent) = self else { return nil }
        return [agent.id]
    }
}

/// The exact request body accepted by `POST /api/canvases/:id/cards`.
public struct CardQueueRequest {
    public var title: String
    public var scope: CardScope?
    public var assignment: AgentAssignment

    public init(title: String, scope: CardScope?, assignment: AgentAssignment = .automatic) {
        self.title = title
        self.scope = scope
        self.assignment = assignment
    }

    public var body: [String: Any] {
        var body: [String: Any] = ["title": title]
        if let scope { body["scope"] = scope.body }
        if let agentIDs = assignment.agentIDs { body["agents"] = agentIDs }
        return body
    }
}

public struct CanvasTask: Codable, Identifiable, Hashable {
    public var id: String
    public var agentName: String
    public var owner: String?
    public var status: String
    public var startedAt: Double
    public var endedAt: Double?
    public var runStartedAt: Double?
    public var failedAt: Double?
    public var failureReason: String?
    public var queuedBy: String?
    public var pipeline: [String]?
    public var stage: Int?
}

public struct CanvasComment: Codable, Identifiable {
    public var id: String
    /// Canvas-pinned comments (and their replies) have no frame ID.
    public var frameId: String?
    public var pageId: String?
    public var x: Double?
    public var y: Double?
    public var from: String
    public var text: String
    public var at: Double
    public var resolvedAt: Double?
    public var parentId: String?
}

public struct CanvasPresence: Codable, Identifiable {
    public var clientId: String
    public var name: String
    public var color: String
    public var kind: String
    public var cursor: CanvasPoint?
    public var id: String { clientId }
}

public struct CanvasPoint: Codable {
    public var x: Double
    public var y: Double
}

public struct WorkspaceSummary: Codable, Identifiable {
    public var id: String
    public var name: String
    public var active: Bool
}

/// Unknown protocol fields remain forward-compatible with newer servers.
public struct CanvasEvent: Decodable {
    public var type: String
    public var canvas: CanvasDocument?
    public var frame: DesignFrame?
    public var frameId: String?
    public var name: String?
    public var pages: [CanvasPage]?
    public var task: CanvasTask?
    public var tasks: [CanvasTask]?
    public var comment: CanvasComment?
    public var comments: [CanvasComment]?
    public var presences: [CanvasPresence]?
    public var presence: CanvasPresence?
    public var clientId: String?
    public var x: Double?
    public var y: Double?
    public var width: Double?
    public var height: Double?
}

public struct WorkspaceList: Decodable {
    public var workspaces: [WorkspaceSummary]
}
