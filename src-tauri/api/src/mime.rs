//! MIME type and content type utilities
//!
//! Provides FFI-safe MIME type detection and handling.

use serde::{Serialize, Deserialize};
use std::collections::HashMap;

/// Common MIME types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MimeType {
    // Text
    TextPlain,
    TextHtml,
    TextCss,
    TextJavascript,
    TextXml,
    TextMarkdown,
    TextCsv,

    // Application
    ApplicationJson,
    ApplicationXml,
    ApplicationPdf,
    ApplicationZip,
    ApplicationGzip,
    ApplicationOctetStream,
    ApplicationFormUrlencoded,
    ApplicationJavascript,
    ApplicationWasm,

    // Image
    ImageJpeg,
    ImagePng,
    ImageGif,
    ImageWebp,
    ImageSvg,
    ImageIco,
    ImageBmp,

    // Audio
    AudioMpeg,
    AudioOgg,
    AudioWav,
    AudioWebm,

    // Video
    VideoMp4,
    VideoWebm,
    VideoOgg,
    VideoQuicktime,

    // Multipart
    MultipartFormData,
    MultipartMixed,

    // Font
    FontWoff,
    FontWoff2,
    FontTtf,
    FontOtf,

    // Unknown
    Unknown,
}

impl MimeType {
    /// Convert to MIME type string
    pub fn as_str(&self) -> &'static str {
        match self {
            MimeType::TextPlain => "text/plain",
            MimeType::TextHtml => "text/html",
            MimeType::TextCss => "text/css",
            MimeType::TextJavascript => "text/javascript",
            MimeType::TextXml => "text/xml",
            MimeType::TextMarkdown => "text/markdown",
            MimeType::TextCsv => "text/csv",

            MimeType::ApplicationJson => "application/json",
            MimeType::ApplicationXml => "application/xml",
            MimeType::ApplicationPdf => "application/pdf",
            MimeType::ApplicationZip => "application/zip",
            MimeType::ApplicationGzip => "application/gzip",
            MimeType::ApplicationOctetStream => "application/octet-stream",
            MimeType::ApplicationFormUrlencoded => "application/x-www-form-urlencoded",
            MimeType::ApplicationJavascript => "application/javascript",
            MimeType::ApplicationWasm => "application/wasm",

            MimeType::ImageJpeg => "image/jpeg",
            MimeType::ImagePng => "image/png",
            MimeType::ImageGif => "image/gif",
            MimeType::ImageWebp => "image/webp",
            MimeType::ImageSvg => "image/svg+xml",
            MimeType::ImageIco => "image/x-icon",
            MimeType::ImageBmp => "image/bmp",

            MimeType::AudioMpeg => "audio/mpeg",
            MimeType::AudioOgg => "audio/ogg",
            MimeType::AudioWav => "audio/wav",
            MimeType::AudioWebm => "audio/webm",

            MimeType::VideoMp4 => "video/mp4",
            MimeType::VideoWebm => "video/webm",
            MimeType::VideoOgg => "video/ogg",
            MimeType::VideoQuicktime => "video/quicktime",

            MimeType::MultipartFormData => "multipart/form-data",
            MimeType::MultipartMixed => "multipart/mixed",

            MimeType::FontWoff => "font/woff",
            MimeType::FontWoff2 => "font/woff2",
            MimeType::FontTtf => "font/ttf",
            MimeType::FontOtf => "font/otf",

            MimeType::Unknown => "application/octet-stream",
        }
    }

    /// Check if this is a text type
    pub fn is_text(&self) -> bool {
        matches!(
            self,
            MimeType::TextPlain
                | MimeType::TextHtml
                | MimeType::TextCss
                | MimeType::TextJavascript
                | MimeType::TextXml
                | MimeType::TextMarkdown
                | MimeType::TextCsv
                | MimeType::ApplicationJson
                | MimeType::ApplicationXml
                | MimeType::ApplicationJavascript
        )
    }

    /// Check if this is an image type
    pub fn is_image(&self) -> bool {
        matches!(
            self,
            MimeType::ImageJpeg
                | MimeType::ImagePng
                | MimeType::ImageGif
                | MimeType::ImageWebp
                | MimeType::ImageSvg
                | MimeType::ImageIco
                | MimeType::ImageBmp
        )
    }

    /// Check if this is an audio type
    pub fn is_audio(&self) -> bool {
        matches!(
            self,
            MimeType::AudioMpeg | MimeType::AudioOgg | MimeType::AudioWav | MimeType::AudioWebm
        )
    }

    /// Check if this is a video type
    pub fn is_video(&self) -> bool {
        matches!(
            self,
            MimeType::VideoMp4
                | MimeType::VideoWebm
                | MimeType::VideoOgg
                | MimeType::VideoQuicktime
        )
    }

    /// Check if this is a font type
    pub fn is_font(&self) -> bool {
        matches!(
            self,
            MimeType::FontWoff | MimeType::FontWoff2 | MimeType::FontTtf | MimeType::FontOtf
        )
    }
}

/// MIME type utilities
pub struct Mime;

impl Mime {
    /// Get MIME type from file extension
    pub fn from_extension(ext: &str) -> MimeType {
        let ext = ext.trim_start_matches('.').to_lowercase();

        match ext.as_str() {
            // Text
            "txt" | "text" => MimeType::TextPlain,
            "html" | "htm" => MimeType::TextHtml,
            "css" => MimeType::TextCss,
            "js" | "mjs" => MimeType::TextJavascript,
            "xml" => MimeType::TextXml,
            "md" | "markdown" => MimeType::TextMarkdown,
            "csv" => MimeType::TextCsv,

            // Application
            "json" => MimeType::ApplicationJson,
            "pdf" => MimeType::ApplicationPdf,
            "zip" => MimeType::ApplicationZip,
            "gz" | "gzip" => MimeType::ApplicationGzip,
            "wasm" => MimeType::ApplicationWasm,

            // Images
            "jpg" | "jpeg" => MimeType::ImageJpeg,
            "png" => MimeType::ImagePng,
            "gif" => MimeType::ImageGif,
            "webp" => MimeType::ImageWebp,
            "svg" => MimeType::ImageSvg,
            "ico" => MimeType::ImageIco,
            "bmp" => MimeType::ImageBmp,

            // Audio
            "mp3" => MimeType::AudioMpeg,
            "ogg" | "oga" => MimeType::AudioOgg,
            "wav" => MimeType::AudioWav,
            "weba" => MimeType::AudioWebm,

            // Video
            "mp4" | "m4v" => MimeType::VideoMp4,
            "webm" => MimeType::VideoWebm,
            "ogv" => MimeType::VideoOgg,
            "mov" => MimeType::VideoQuicktime,

            // Fonts
            "woff" => MimeType::FontWoff,
            "woff2" => MimeType::FontWoff2,
            "ttf" => MimeType::FontTtf,
            "otf" => MimeType::FontOtf,

            _ => MimeType::Unknown,
        }
    }

    /// Get MIME type from filename
    pub fn from_filename(filename: &str) -> MimeType {
        filename
            .rsplit('.')
            .next()
            .map(Self::from_extension)
            .unwrap_or(MimeType::Unknown)
    }

    /// Parse MIME type string
    pub fn parse(mime_str: &str) -> MimeType {
        // Remove parameters (e.g., charset)
        let mime = mime_str.split(';').next().unwrap_or("").trim();

        match mime.to_lowercase().as_str() {
            "text/plain" => MimeType::TextPlain,
            "text/html" => MimeType::TextHtml,
            "text/css" => MimeType::TextCss,
            "text/javascript" | "application/javascript" => MimeType::TextJavascript,
            "text/xml" => MimeType::TextXml,
            "text/markdown" => MimeType::TextMarkdown,
            "text/csv" => MimeType::TextCsv,

            "application/json" => MimeType::ApplicationJson,
            "application/xml" => MimeType::ApplicationXml,
            "application/pdf" => MimeType::ApplicationPdf,
            "application/zip" => MimeType::ApplicationZip,
            "application/gzip" => MimeType::ApplicationGzip,
            "application/octet-stream" => MimeType::ApplicationOctetStream,
            "application/x-www-form-urlencoded" => MimeType::ApplicationFormUrlencoded,
            "application/wasm" => MimeType::ApplicationWasm,

            "image/jpeg" => MimeType::ImageJpeg,
            "image/png" => MimeType::ImagePng,
            "image/gif" => MimeType::ImageGif,
            "image/webp" => MimeType::ImageWebp,
            "image/svg+xml" => MimeType::ImageSvg,
            "image/x-icon" => MimeType::ImageIco,
            "image/bmp" => MimeType::ImageBmp,

            "audio/mpeg" => MimeType::AudioMpeg,
            "audio/ogg" => MimeType::AudioOgg,
            "audio/wav" => MimeType::AudioWav,
            "audio/webm" => MimeType::AudioWebm,

            "video/mp4" => MimeType::VideoMp4,
            "video/webm" => MimeType::VideoWebm,
            "video/ogg" => MimeType::VideoOgg,
            "video/quicktime" => MimeType::VideoQuicktime,

            "multipart/form-data" => MimeType::MultipartFormData,
            "multipart/mixed" => MimeType::MultipartMixed,

            "font/woff" => MimeType::FontWoff,
            "font/woff2" => MimeType::FontWoff2,
            "font/ttf" => MimeType::FontTtf,
            "font/otf" => MimeType::FontOtf,

            _ => MimeType::Unknown,
        }
    }

    /// Detect MIME type from file content (magic bytes)
    pub fn from_bytes(data: &[u8]) -> MimeType {
        if data.len() < 4 {
            return MimeType::Unknown;
        }

        // Check magic bytes
        match &data[..4] {
            // Images
            [0xFF, 0xD8, 0xFF, _] => MimeType::ImageJpeg,
            [0x89, 0x50, 0x4E, 0x47] => MimeType::ImagePng,
            [0x47, 0x49, 0x46, 0x38] => MimeType::ImageGif,
            [0x52, 0x49, 0x46, 0x46] if data.len() >= 12 && &data[8..12] == b"WEBP" => {
                MimeType::ImageWebp
            }

            // Archives
            [0x50, 0x4B, 0x03, 0x04] => MimeType::ApplicationZip,
            [0x1F, 0x8B, _, _] => MimeType::ApplicationGzip,

            // PDF
            [0x25, 0x50, 0x44, 0x46] => MimeType::ApplicationPdf,

            // WebAssembly
            [0x00, 0x61, 0x73, 0x6D] => MimeType::ApplicationWasm,

            // Audio/Video
            [0x49, 0x44, 0x33, _] => MimeType::AudioMpeg, // ID3 tag (MP3)
            [0x4F, 0x67, 0x67, 0x53] => MimeType::AudioOgg,
            [0x52, 0x49, 0x46, 0x46] if data.len() >= 12 && &data[8..12] == b"WAVE" => {
                MimeType::AudioWav
            }

            // Try to detect text
            _ => {
                // Check if it looks like text (UTF-8)
                if data.iter().all(|&b| b < 128 || b >= 192) {
                    // Check for JSON
                    if data.starts_with(b"{") || data.starts_with(b"[") {
                        MimeType::ApplicationJson
                    } else if data.starts_with(b"<!DOCTYPE") || data.starts_with(b"<html") {
                        MimeType::TextHtml
                    } else if data.starts_with(b"<?xml") {
                        MimeType::TextXml
                    } else {
                        MimeType::TextPlain
                    }
                } else {
                    MimeType::ApplicationOctetStream
                }
            }
        }
    }

    /// Get appropriate file extension for MIME type
    pub fn to_extension(mime: MimeType) -> &'static str {
        match mime {
            MimeType::TextPlain => "txt",
            MimeType::TextHtml => "html",
            MimeType::TextCss => "css",
            MimeType::TextJavascript => "js",
            MimeType::TextXml => "xml",
            MimeType::TextMarkdown => "md",
            MimeType::TextCsv => "csv",

            MimeType::ApplicationJson => "json",
            MimeType::ApplicationXml => "xml",
            MimeType::ApplicationPdf => "pdf",
            MimeType::ApplicationZip => "zip",
            MimeType::ApplicationGzip => "gz",
            MimeType::ApplicationOctetStream => "bin",
            MimeType::ApplicationFormUrlencoded => "txt",
            MimeType::ApplicationJavascript => "js",
            MimeType::ApplicationWasm => "wasm",

            MimeType::ImageJpeg => "jpg",
            MimeType::ImagePng => "png",
            MimeType::ImageGif => "gif",
            MimeType::ImageWebp => "webp",
            MimeType::ImageSvg => "svg",
            MimeType::ImageIco => "ico",
            MimeType::ImageBmp => "bmp",

            MimeType::AudioMpeg => "mp3",
            MimeType::AudioOgg => "ogg",
            MimeType::AudioWav => "wav",
            MimeType::AudioWebm => "weba",

            MimeType::VideoMp4 => "mp4",
            MimeType::VideoWebm => "webm",
            MimeType::VideoOgg => "ogv",
            MimeType::VideoQuicktime => "mov",

            MimeType::MultipartFormData => "txt",
            MimeType::MultipartMixed => "txt",

            MimeType::FontWoff => "woff",
            MimeType::FontWoff2 => "woff2",
            MimeType::FontTtf => "ttf",
            MimeType::FontOtf => "otf",

            MimeType::Unknown => "bin",
        }
    }

    /// Build content-type header with charset
    pub fn with_charset(mime: MimeType, charset: &str) -> String {
        format!("{}; charset={}", mime.as_str(), charset)
    }

    /// Build content-type header with UTF-8 charset (for text types)
    pub fn with_utf8(mime: MimeType) -> String {
        if mime.is_text() {
            Self::with_charset(mime, "utf-8")
        } else {
            mime.as_str().to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_from_extension() {
        assert_eq!(Mime::from_extension("jpg"), MimeType::ImageJpeg);
        assert_eq!(Mime::from_extension(".png"), MimeType::ImagePng);
        assert_eq!(Mime::from_extension("JSON"), MimeType::ApplicationJson);
    }

    #[test]
    fn test_from_filename() {
        assert_eq!(Mime::from_filename("image.jpg"), MimeType::ImageJpeg);
        assert_eq!(Mime::from_filename("document.pdf"), MimeType::ApplicationPdf);
        assert_eq!(Mime::from_filename("script.js"), MimeType::TextJavascript);
    }

    #[test]
    fn test_parse() {
        assert_eq!(Mime::parse("application/json"), MimeType::ApplicationJson);
        assert_eq!(
            Mime::parse("text/html; charset=utf-8"),
            MimeType::TextHtml
        );
    }

    #[test]
    fn test_from_bytes() {
        let jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0x00];
        assert_eq!(Mime::from_bytes(&jpeg), MimeType::ImageJpeg);

        let png = [0x89, 0x50, 0x4E, 0x47, 0x0D];
        assert_eq!(Mime::from_bytes(&png), MimeType::ImagePng);

        let json = b"{\"key\": \"value\"}";
        assert_eq!(Mime::from_bytes(json), MimeType::ApplicationJson);
    }

    #[test]
    fn test_type_checks() {
        assert!(MimeType::TextHtml.is_text());
        assert!(MimeType::ImagePng.is_image());
        assert!(MimeType::AudioMpeg.is_audio());
        assert!(MimeType::VideoMp4.is_video());
        assert!(MimeType::FontWoff2.is_font());
    }
}
