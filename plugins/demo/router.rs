use api::{HttpRequest, HttpResponse, json, json_response, serde_json};
use notify_rust::Notification;
use serde::Deserialize;
use sysinfo::System;
use nvml_wrapper::Nvml;
use brightness::Brightness;
use parking_lot::Mutex;
use once_cell::sync::Lazy;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use rustfft::{FftPlanner, num_complex::Complex};

// Global audio capture state
static AUDIO_BUFFER: Lazy<Arc<Mutex<Vec<f32>>>> = Lazy::new(|| Arc::new(Mutex::new(vec![0.0; 2048])));
static AUDIO_CAPTURING: AtomicBool = AtomicBool::new(false);
static AUDIO_STOP_FLAG: AtomicBool = AtomicBool::new(false);
static SELECTED_DEVICE: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));

pub async fn handle_hello() -> HttpResponse {
    println!("[Demo Plugin] Hello from Rust backend!");

    let response = json!({
        "message": "Hello from the Demo Plugin Rust backend!",
        "timestamp": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    });

    json_response(&response)
}

#[derive(Deserialize)]
struct NotifyRequest {
    title: Option<String>,
    message: Option<String>,
}

pub async fn handle_notify(req: HttpRequest) -> HttpResponse {
    let body: NotifyRequest = match req.body_json() {
        Ok(v) => v,
        Err(e) => {
            return json_response(&json!({
                "success": false,
                "error": format!("Invalid JSON body: {}", e)
            }));
        }
    };

    let title = body.title.unwrap_or_else(|| "Demo Plugin".to_string());
    let message = body.message.unwrap_or_else(|| "Hello from WebArcade!".to_string());

    println!("[Demo Plugin] Sending notification: {} - {}", title, message);

    match Notification::new()
        .summary(&title)
        .body(&message)
        .timeout(5000)
        .show()
    {
        Ok(_) => {
            json_response(&json!({
                "success": true,
                "message": "Notification sent successfully!"
            }))
        }
        Err(e) => {
            json_response(&json!({
                "success": false,
                "error": format!("Failed to send notification: {}", e)
            }))
        }
    }
}

pub async fn handle_cpu_info() -> HttpResponse {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpuid = raw_cpuid::CpuId::new();

    let brand = cpuid.get_processor_brand_string()
        .map(|b| b.as_str().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    let features = cpuid.get_feature_info();

    let cpu_count = sys.cpus().len();
    let physical_cores = sys.physical_core_count().unwrap_or(cpu_count);

    // Get CPU usage
    let cpu_usage: f64 = sys.cpus().iter()
        .map(|cpu| cpu.cpu_usage() as f64)
        .sum::<f64>() / cpu_count as f64;

    // Get per-core usage
    let per_core_usage: Vec<f64> = sys.cpus().iter()
        .map(|cpu| cpu.cpu_usage() as f64)
        .collect();

    // Get frequency
    let frequency = sys.cpus().first()
        .map(|cpu| cpu.frequency())
        .unwrap_or(0);

    let response = json!({
        "brand": brand.trim(),
        "physical_cores": physical_cores,
        "logical_cores": cpu_count,
        "frequency_mhz": frequency,
        "usage_percent": cpu_usage,
        "per_core_usage": per_core_usage,
        "architecture": std::env::consts::ARCH,
        "has_sse": features.as_ref().map(|f| f.has_sse()).unwrap_or(false),
        "has_sse2": features.as_ref().map(|f| f.has_sse2()).unwrap_or(false),
        "has_avx": features.as_ref().map(|f| f.has_avx()).unwrap_or(false),
    });

    json_response(&response)
}

pub async fn handle_gpu_info() -> HttpResponse {
    match Nvml::init() {
        Ok(nvml) => {
            match nvml.device_by_index(0) {
                Ok(device) => {
                    let name = device.name().unwrap_or_else(|_| "Unknown".to_string());
                    let memory_info = device.memory_info().ok();
                    let utilization = device.utilization_rates().ok();
                    let temperature = device.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu).ok();
                    let power_usage = device.power_usage().ok();
                    let driver_version = nvml.sys_driver_version().unwrap_or_else(|_| "Unknown".to_string());
                    let cuda_version = nvml.sys_cuda_driver_version().ok();

                    let response = json!({
                        "available": true,
                        "name": name,
                        "driver_version": driver_version,
                        "cuda_version": cuda_version.map(|v| format!("{}.{}", v / 1000, (v % 1000) / 10)),
                        "memory": memory_info.map(|m| json!({
                            "total_mb": m.total / 1024 / 1024,
                            "used_mb": m.used / 1024 / 1024,
                            "free_mb": m.free / 1024 / 1024,
                            "usage_percent": (m.used as f64 / m.total as f64) * 100.0
                        })),
                        "utilization": utilization.map(|u| json!({
                            "gpu_percent": u.gpu,
                            "memory_percent": u.memory
                        })),
                        "temperature_c": temperature,
                        "power_watts": power_usage.map(|p| p as f64 / 1000.0),
                    });

                    json_response(&response)
                }
                Err(e) => {
                    json_response(&json!({
                        "available": false,
                        "error": format!("Failed to get GPU: {}", e)
                    }))
                }
            }
        }
        Err(_) => {
            json_response(&json!({
                "available": false,
                "error": "No NVIDIA GPU found or NVML not available"
            }))
        }
    }
}

pub async fn handle_ram_info() -> HttpResponse {
    let mut sys = System::new_all();
    sys.refresh_memory();

    let total = sys.total_memory();
    let used = sys.used_memory();
    let available = sys.available_memory();
    let total_swap = sys.total_swap();
    let used_swap = sys.used_swap();

    let response = json!({
        "total_gb": total as f64 / 1024.0 / 1024.0 / 1024.0,
        "used_gb": used as f64 / 1024.0 / 1024.0 / 1024.0,
        "available_gb": available as f64 / 1024.0 / 1024.0 / 1024.0,
        "usage_percent": (used as f64 / total as f64) * 100.0,
        "swap": {
            "total_gb": total_swap as f64 / 1024.0 / 1024.0 / 1024.0,
            "used_gb": used_swap as f64 / 1024.0 / 1024.0 / 1024.0,
            "usage_percent": if total_swap > 0 { (used_swap as f64 / total_swap as f64) * 100.0 } else { 0.0 }
        }
    });

    json_response(&response)
}

pub async fn handle_usb_devices() -> HttpResponse {
    // Use WMI to query USB devices on Windows
    let devices = get_usb_devices_wmi();

    json_response(&json!({
        "devices": devices
    }))
}

fn get_usb_devices_wmi() -> Vec<serde_json::Value> {
    use wmi::{COMLibrary, WMIConnection};
    use std::collections::HashMap;

    let com_lib = match COMLibrary::new() {
        Ok(lib) => lib,
        Err(_) => return vec![],
    };

    let wmi_con = match WMIConnection::new(com_lib) {
        Ok(con) => con,
        Err(_) => return vec![],
    };

    let results: Vec<HashMap<String, wmi::Variant>> = wmi_con
        .raw_query("SELECT * FROM Win32_USBHub")
        .unwrap_or_default();

    results.iter().map(|device| {
        json!({
            "name": device.get("Name").map(variant_to_string).unwrap_or_default(),
            "device_id": device.get("DeviceID").map(variant_to_string).unwrap_or_default(),
            "status": device.get("Status").map(variant_to_string).unwrap_or_default(),
        })
    }).collect()
}

fn variant_to_string(v: &wmi::Variant) -> String {
    match v {
        wmi::Variant::String(s) => s.clone(),
        wmi::Variant::I4(i) => i.to_string(),
        wmi::Variant::UI4(i) => i.to_string(),
        wmi::Variant::Bool(b) => b.to_string(),
        _ => String::new(),
    }
}

pub async fn handle_audio_level() -> HttpResponse {
    use cpal::traits::{DeviceTrait, HostTrait};

    // Try to get current audio output level
    let host = cpal::default_host();

    // Get output device info
    let output_device = host.default_output_device();
    let input_device = host.default_input_device();

    let output_info = output_device.as_ref().map(|d| {
        json!({
            "name": d.name().unwrap_or_else(|_| "Unknown".to_string()),
        })
    });

    let input_info = input_device.as_ref().map(|d| {
        json!({
            "name": d.name().unwrap_or_else(|_| "Unknown".to_string()),
        })
    });

    // List all output devices
    let output_devices: Vec<serde_json::Value> = host.output_devices()
        .map(|devices| {
            devices.filter_map(|d| {
                Some(json!({
                    "name": d.name().ok()?
                }))
            }).collect()
        })
        .unwrap_or_default();

    // List all input devices
    let input_devices: Vec<serde_json::Value> = host.input_devices()
        .map(|devices| {
            devices.filter_map(|d| {
                Some(json!({
                    "name": d.name().ok()?
                }))
            }).collect()
        })
        .unwrap_or_default();

    let response = json!({
        "default_output": output_info,
        "default_input": input_info,
        "output_devices": output_devices,
        "input_devices": input_devices,
        "host": host.id().name(),
    });

    json_response(&response)
}

pub async fn handle_get_brightness() -> HttpResponse {
    use futures::StreamExt;

    let devices: Vec<_> = brightness::brightness_devices().collect().await;

    let mut monitors = Vec::new();
    for device in devices {
        if let Ok(dev) = device {
            let name = dev.device_name().await.unwrap_or_else(|_| "Unknown".to_string());
            let level = dev.get().await.unwrap_or(0);
            monitors.push(json!({
                "name": name,
                "brightness": level
            }));
        }
    }

    json_response(&json!({
        "monitors": monitors
    }))
}

#[derive(Deserialize)]
struct BrightnessRequest {
    brightness: u32,
    monitor: Option<String>,
}

pub async fn handle_set_brightness(req: HttpRequest) -> HttpResponse {
    use futures::StreamExt;

    let body: BrightnessRequest = match req.body_json() {
        Ok(v) => v,
        Err(e) => {
            return json_response(&json!({
                "success": false,
                "error": format!("Invalid JSON body: {}", e)
            }));
        }
    };

    let brightness_value = body.brightness.min(100);
    let devices: Vec<_> = brightness::brightness_devices().collect().await;

    let mut success = false;
    let mut error_msg = String::new();

    for device in devices {
        if let Ok(mut dev) = device {
            let name = dev.device_name().await.unwrap_or_else(|_| "Unknown".to_string());

            // If a specific monitor is requested, only set that one
            if let Some(ref target) = body.monitor {
                if !name.contains(target) {
                    continue;
                }
            }

            match dev.set(brightness_value).await {
                Ok(_) => {
                    success = true;
                    println!("[Demo Plugin] Set brightness to {}% on {}", brightness_value, name);
                }
                Err(e) => {
                    error_msg = format!("Failed to set brightness: {}", e);
                }
            }
        }
    }

    if success {
        json_response(&json!({
            "success": true,
            "brightness": brightness_value
        }))
    } else {
        json_response(&json!({
            "success": false,
            "error": if error_msg.is_empty() { "No monitors found".to_string() } else { error_msg }
        }))
    }
}

// Audio spectrum analyzer - list available input devices
pub async fn handle_audio_devices() -> HttpResponse {
    use cpal::traits::{DeviceTrait, HostTrait};

    let host = cpal::default_host();

    let mut devices = Vec::new();

    // Get all input devices
    if let Ok(input_devices) = host.input_devices() {
        for device in input_devices {
            if let Ok(name) = device.name() {
                // Check if device supports input
                if device.default_input_config().is_ok() {
                    devices.push(json!({
                        "name": name,
                        "type": "input"
                    }));
                }
            }
        }
    }

    // Get default device name
    let default_name = host.default_input_device()
        .and_then(|d| d.name().ok())
        .unwrap_or_default();

    json_response(&json!({
        "devices": devices,
        "default": default_name
    }))
}

#[derive(Deserialize)]
struct AudioCaptureRequest {
    device: Option<String>,
}

// Audio spectrum analyzer
pub async fn handle_start_audio_capture(req: HttpRequest) -> HttpResponse {
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

    if AUDIO_CAPTURING.load(Ordering::SeqCst) {
        return json_response(&json!({
            "success": true,
            "message": "Already capturing"
        }));
    }

    // Parse request for device name
    let device_name = req.body_json::<AudioCaptureRequest>()
        .ok()
        .and_then(|r| r.device);

    // Store selected device
    *SELECTED_DEVICE.lock() = device_name.clone();

    // Reset stop flag
    AUDIO_STOP_FLAG.store(false, Ordering::SeqCst);
    AUDIO_CAPTURING.store(true, Ordering::SeqCst);

    let buffer = AUDIO_BUFFER.clone();

    // Spawn a thread to handle audio capture
    std::thread::spawn(move || {
        let host = cpal::default_host();

        // Find the requested device or use default
        let device = if let Some(ref name) = device_name {
            host.input_devices()
                .ok()
                .and_then(|mut devices| devices.find(|d| d.name().ok().as_ref() == Some(name)))
                .or_else(|| host.default_input_device())
        } else {
            host.default_input_device()
        };

        let device = match device {
            Some(d) => d,
            None => {
                eprintln!("[Audio] No input device found");
                AUDIO_CAPTURING.store(false, Ordering::SeqCst);
                return;
            }
        };

        if let Ok(name) = device.name() {
            println!("[Audio] Using device: {}", name);
        }

        let config = match device.default_input_config() {
            Ok(c) => {
                println!("[Audio] Config: {:?}", c);
                c
            }
            Err(e) => {
                eprintln!("[Audio] Failed to get config: {}", e);
                AUDIO_CAPTURING.store(false, Ordering::SeqCst);
                return;
            }
        };

        let sample_format = config.sample_format();
        println!("[Audio] Sample format: {:?}", sample_format);

        let stream = match sample_format {
            cpal::SampleFormat::F32 => {
                println!("[Audio] Building F32 stream...");
                device.build_input_stream(
                    &config.into(),
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        let mut buf = buffer.lock();
                        let len = data.len().min(buf.len());
                        buf[..len].copy_from_slice(&data[..len]);
                    },
                    |err| eprintln!("[Audio] Stream error: {}", err),
                    None
                )
            }
            cpal::SampleFormat::I16 => {
                println!("[Audio] Building I16 stream...");
                let buffer_clone = buffer.clone();
                device.build_input_stream(
                    &config.into(),
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        let mut buf = buffer_clone.lock();
                        for (i, sample) in data.iter().take(buf.len()).enumerate() {
                            buf[i] = *sample as f32 / 32768.0;
                        }
                    },
                    |err| eprintln!("[Audio] Stream error: {}", err),
                    None
                )
            }
            cpal::SampleFormat::U16 => {
                println!("[Audio] Building U16 stream...");
                let buffer_clone = buffer.clone();
                device.build_input_stream(
                    &config.into(),
                    move |data: &[u16], _: &cpal::InputCallbackInfo| {
                        let mut buf = buffer_clone.lock();
                        for (i, sample) in data.iter().take(buf.len()).enumerate() {
                            buf[i] = (*sample as f32 / 32768.0) - 1.0;
                        }
                    },
                    |err| eprintln!("[Audio] Stream error: {}", err),
                    None
                )
            }
            cpal::SampleFormat::I32 => {
                println!("[Audio] Building I32 stream...");
                let buffer_clone = buffer.clone();
                device.build_input_stream(
                    &config.into(),
                    move |data: &[i32], _: &cpal::InputCallbackInfo| {
                        let mut buf = buffer_clone.lock();
                        for (i, sample) in data.iter().take(buf.len()).enumerate() {
                            buf[i] = *sample as f32 / 2147483648.0;
                        }
                    },
                    |err| eprintln!("[Audio] Stream error: {}", err),
                    None
                )
            }
            _ => {
                eprintln!("[Audio] Unsupported sample format: {:?}", sample_format);
                AUDIO_CAPTURING.store(false, Ordering::SeqCst);
                return;
            }
        };

        match stream {
            Ok(s) => {
                println!("[Audio] Stream built, starting playback...");
                if let Err(e) = s.play() {
                    eprintln!("[Audio] Failed to play stream: {}", e);
                    AUDIO_CAPTURING.store(false, Ordering::SeqCst);
                    return;
                }
                println!("[Audio] Stream playing, capturing audio...");

                // Keep the stream alive until stop flag is set
                while !AUDIO_STOP_FLAG.load(Ordering::SeqCst) {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }

                println!("[Audio] Stop flag received, stopping capture");
                // Stream is dropped here when we exit
                AUDIO_CAPTURING.store(false, Ordering::SeqCst);
            }
            Err(e) => {
                eprintln!("[Audio] Failed to build stream: {}", e);
                AUDIO_CAPTURING.store(false, Ordering::SeqCst);
            }
        }
    });

    json_response(&json!({
        "success": true,
        "message": "Audio capture started"
    }))
}

pub async fn handle_stop_audio_capture(_req: HttpRequest) -> HttpResponse {
    AUDIO_STOP_FLAG.store(true, Ordering::SeqCst);

    // Wait a bit for the thread to stop
    std::thread::sleep(std::time::Duration::from_millis(100));

    json_response(&json!({
        "success": true,
        "message": "Audio capture stopped"
    }))
}

pub async fn handle_audio_spectrum() -> HttpResponse {
    let capturing = AUDIO_CAPTURING.load(Ordering::SeqCst);
    let buffer = AUDIO_BUFFER.lock();

    // Calculate RMS to check if we have signal
    let rms: f32 = (buffer.iter().map(|s| s * s).sum::<f32>() / buffer.len() as f32).sqrt();

    // Perform FFT
    let mut planner = FftPlanner::new();
    let fft = planner.plan_fft_forward(buffer.len());

    let mut complex_buffer: Vec<Complex<f32>> = buffer
        .iter()
        .enumerate()
        .map(|(i, &sample)| {
            // Apply Hanning window
            let window = 0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / buffer.len() as f32).cos());
            Complex::new(sample * window, 0.0)
        })
        .collect();

    fft.process(&mut complex_buffer);

    // Get magnitude spectrum (only first half due to symmetry)
    // Apply noise gate based on RMS level
    let noise_gate = 0.01; // Minimum RMS to show anything
    let gain = if rms > noise_gate { 100.0 } else { 0.0 }; // Amplification factor

    let spectrum: Vec<f32> = complex_buffer[..buffer.len() / 2]
        .iter()
        .map(|c| {
            if rms < noise_gate {
                return 0.0;
            }
            let magnitude = c.norm() / buffer.len() as f32;
            // Use dB scale with moderate amplification
            let db = 20.0 * (magnitude * gain + 0.00001).log10();
            // Map from roughly -60dB to 0dB range to 0-100, with a floor
            let value = ((db + 60.0) / 60.0 * 100.0).clamp(0.0, 100.0);
            // Apply additional noise floor cutoff
            if value < 15.0 { 0.0 } else { value - 15.0 } // Subtract noise floor
        })
        .collect();

    // Reduce to 64 bands for visualization
    let bands = 64;
    let band_size = spectrum.len() / bands;
    let reduced: Vec<f32> = (0..bands)
        .map(|i| {
            let start = i * band_size;
            let end = start + band_size;
            spectrum[start..end].iter().sum::<f32>() / band_size as f32
        })
        .collect();

    json_response(&json!({
        "spectrum": reduced,
        "capturing": capturing,
        "rms": rms
    }))
}

// Shell command execution for terminal
#[derive(Deserialize)]
struct ShellRequest {
    command: String,
    cwd: Option<String>,
}

pub async fn handle_shell_exec(req: HttpRequest) -> HttpResponse {
    let body: ShellRequest = match req.body_json() {
        Ok(v) => v,
        Err(e) => {
            return json_response(&json!({
                "success": false,
                "error": format!("Invalid JSON body: {}", e)
            }));
        }
    };

    use std::process::Command;

    let mut cmd = if cfg!(windows) {
        let mut c = Command::new("cmd");
        c.args(["/C", &body.command]);
        c
    } else {
        let mut c = Command::new("sh");
        c.args(["-c", &body.command]);
        c
    };

    if let Some(cwd) = body.cwd {
        cmd.current_dir(cwd);
    }

    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();

            json_response(&json!({
                "success": output.status.success(),
                "stdout": stdout,
                "stderr": stderr,
                "exit_code": output.status.code()
            }))
        }
        Err(e) => {
            json_response(&json!({
                "success": false,
                "error": format!("Failed to execute command: {}", e)
            }))
        }
    }
}

// ============================================
// WEBCAM CAPTURE
// ============================================
use nokhwa::{Camera, utils::{CameraIndex, RequestedFormat, RequestedFormatType}};
use std::io::Cursor;

static WEBCAM_CAPTURING: AtomicBool = AtomicBool::new(false);
static WEBCAM_STOP_FLAG: AtomicBool = AtomicBool::new(false);
static WEBCAM_FRAME: Lazy<Arc<Mutex<Option<String>>>> = Lazy::new(|| Arc::new(Mutex::new(None)));

pub async fn handle_webcam_devices() -> HttpResponse {
    use nokhwa::utils::CameraInfo;

    let devices: Vec<CameraInfo> = nokhwa::query(nokhwa::utils::ApiBackend::Auto)
        .unwrap_or_default();

    let device_list: Vec<serde_json::Value> = devices.iter().map(|d| {
        json!({
            "index": d.index().as_index().unwrap_or(0),
            "name": d.human_name(),
            "description": d.description()
        })
    }).collect();

    json_response(&json!({
        "devices": device_list
    }))
}

#[derive(Deserialize)]
struct WebcamStartRequest {
    device_index: Option<u32>,
    width: Option<u32>,
    height: Option<u32>,
}

pub async fn handle_webcam_start(req: HttpRequest) -> HttpResponse {
    if WEBCAM_CAPTURING.load(Ordering::SeqCst) {
        return json_response(&json!({
            "success": true,
            "message": "Already capturing"
        }));
    }

    let body: WebcamStartRequest = req.body_json().unwrap_or(WebcamStartRequest {
        device_index: None,
        width: None,
        height: None,
    });

    let device_index = body.device_index.unwrap_or(0);
    let width = body.width.unwrap_or(640);
    let height = body.height.unwrap_or(480);

    WEBCAM_STOP_FLAG.store(false, Ordering::SeqCst);
    WEBCAM_CAPTURING.store(true, Ordering::SeqCst);

    let frame_buffer = WEBCAM_FRAME.clone();

    std::thread::spawn(move || {
        let index = CameraIndex::Index(device_index);
        let requested = RequestedFormat::new::<nokhwa::pixel_format::RgbFormat>(
            RequestedFormatType::AbsoluteHighestResolution
        );

        let mut camera = match Camera::new(index, requested) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("[Webcam] Failed to open camera: {}", e);
                WEBCAM_CAPTURING.store(false, Ordering::SeqCst);
                return;
            }
        };

        if let Err(e) = camera.open_stream() {
            eprintln!("[Webcam] Failed to open stream: {}", e);
            WEBCAM_CAPTURING.store(false, Ordering::SeqCst);
            return;
        }

        println!("[Webcam] Stream started");

        while !WEBCAM_STOP_FLAG.load(Ordering::SeqCst) {
            match camera.frame() {
                Ok(frame) => {
                    // Convert to image and then to base64 JPEG
                    let image = frame.decode_image::<nokhwa::pixel_format::RgbFormat>().unwrap();
                    let mut jpeg_data = Vec::new();
                    let mut cursor = Cursor::new(&mut jpeg_data);

                    if let Ok(_) = image.write_to(&mut cursor, image::ImageFormat::Jpeg) {
                        let base64_str = base64::Engine::encode(
                            &base64::engine::general_purpose::STANDARD,
                            &jpeg_data
                        );
                        *frame_buffer.lock() = Some(format!("data:image/jpeg;base64,{}", base64_str));
                    }
                }
                Err(e) => {
                    eprintln!("[Webcam] Frame error: {}", e);
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(33)); // ~30fps
        }

        let _ = camera.stop_stream();
        WEBCAM_CAPTURING.store(false, Ordering::SeqCst);
        println!("[Webcam] Stream stopped");
    });

    json_response(&json!({
        "success": true,
        "message": "Webcam capture started"
    }))
}

pub async fn handle_webcam_stop(_req: HttpRequest) -> HttpResponse {
    WEBCAM_STOP_FLAG.store(true, Ordering::SeqCst);
    std::thread::sleep(std::time::Duration::from_millis(100));
    *WEBCAM_FRAME.lock() = None;

    json_response(&json!({
        "success": true,
        "message": "Webcam capture stopped"
    }))
}

pub async fn handle_webcam_frame() -> HttpResponse {
    let frame = WEBCAM_FRAME.lock();

    json_response(&json!({
        "capturing": WEBCAM_CAPTURING.load(Ordering::SeqCst),
        "frame": *frame
    }))
}

// ============================================
// QR CODE GENERATOR
// ============================================
use qrcode::QrCode;
use qrcode::render::svg;

#[derive(Deserialize)]
struct QrCodeRequest {
    text: String,
    size: Option<u32>,
}

pub async fn handle_qrcode_generate(req: HttpRequest) -> HttpResponse {
    let body: QrCodeRequest = match req.body_json() {
        Ok(v) => v,
        Err(e) => {
            return json_response(&json!({
                "success": false,
                "error": format!("Invalid request: {}", e)
            }));
        }
    };

    match QrCode::new(body.text.as_bytes()) {
        Ok(code) => {
            let svg = code.render()
                .min_dimensions(body.size.unwrap_or(200), body.size.unwrap_or(200))
                .dark_color(svg::Color("#000000"))
                .light_color(svg::Color("#ffffff"))
                .build();

            json_response(&json!({
                "success": true,
                "svg": svg
            }))
        }
        Err(e) => {
            json_response(&json!({
                "success": false,
                "error": format!("Failed to generate QR code: {}", e)
            }))
        }
    }
}

// ============================================
// TEXT-TO-SPEECH
// ============================================
use tts::Tts;

static TTS_ENGINE: Lazy<Mutex<Option<Tts>>> = Lazy::new(|| {
    Mutex::new(Tts::default().ok())
});

#[derive(Deserialize)]
struct TtsRequest {
    text: String,
    rate: Option<f32>,
    volume: Option<f32>,
}

pub async fn handle_tts_speak(req: HttpRequest) -> HttpResponse {
    let body: TtsRequest = match req.body_json() {
        Ok(v) => v,
        Err(e) => {
            return json_response(&json!({
                "success": false,
                "error": format!("Invalid request: {}", e)
            }));
        }
    };

    let mut tts_guard = TTS_ENGINE.lock();

    if let Some(ref mut tts) = *tts_guard {
        // Set rate if provided (typically -1.0 to 1.0 range)
        if let Some(rate) = body.rate {
            let _ = tts.set_rate(rate);
        }

        // Set volume if provided (0.0 to 1.0)
        if let Some(volume) = body.volume {
            let _ = tts.set_volume(volume);
        }

        match tts.speak(&body.text, false) {
            Ok(_) => {
                json_response(&json!({
                    "success": true,
                    "message": "Speaking..."
                }))
            }
            Err(e) => {
                json_response(&json!({
                    "success": false,
                    "error": format!("TTS error: {}", e)
                }))
            }
        }
    } else {
        json_response(&json!({
            "success": false,
            "error": "TTS not available"
        }))
    }
}

pub async fn handle_tts_stop(_req: HttpRequest) -> HttpResponse {
    let mut tts_guard = TTS_ENGINE.lock();

    if let Some(ref mut tts) = *tts_guard {
        let _ = tts.stop();
        json_response(&json!({
            "success": true,
            "message": "TTS stopped"
        }))
    } else {
        json_response(&json!({
            "success": false,
            "error": "TTS not available"
        }))
    }
}

// ============================================
// GAMEPAD INPUT
// ============================================
use gilrs::{Gilrs, Button, Axis};

static GILRS: Lazy<Mutex<Option<Gilrs>>> = Lazy::new(|| {
    Mutex::new(Gilrs::new().ok())
});

pub async fn handle_gamepad_state() -> HttpResponse {
    let mut gilrs_guard = GILRS.lock();

    if let Some(ref mut gilrs) = *gilrs_guard {
        // Process events to update state
        while gilrs.next_event().is_some() {}

        let mut gamepads = Vec::new();

        for (id, gamepad) in gilrs.gamepads() {
            let buttons: Vec<(&str, bool)> = [
                ("South", gamepad.is_pressed(Button::South)),
                ("East", gamepad.is_pressed(Button::East)),
                ("North", gamepad.is_pressed(Button::North)),
                ("West", gamepad.is_pressed(Button::West)),
                ("LeftTrigger", gamepad.is_pressed(Button::LeftTrigger)),
                ("RightTrigger", gamepad.is_pressed(Button::RightTrigger)),
                ("LeftTrigger2", gamepad.is_pressed(Button::LeftTrigger2)),
                ("RightTrigger2", gamepad.is_pressed(Button::RightTrigger2)),
                ("Select", gamepad.is_pressed(Button::Select)),
                ("Start", gamepad.is_pressed(Button::Start)),
                ("DPadUp", gamepad.is_pressed(Button::DPadUp)),
                ("DPadDown", gamepad.is_pressed(Button::DPadDown)),
                ("DPadLeft", gamepad.is_pressed(Button::DPadLeft)),
                ("DPadRight", gamepad.is_pressed(Button::DPadRight)),
            ].into_iter().collect();

            let axes: Vec<(&str, f32)> = [
                ("LeftStickX", gamepad.value(Axis::LeftStickX)),
                ("LeftStickY", gamepad.value(Axis::LeftStickY)),
                ("RightStickX", gamepad.value(Axis::RightStickX)),
                ("RightStickY", gamepad.value(Axis::RightStickY)),
                ("LeftZ", gamepad.value(Axis::LeftZ)),
                ("RightZ", gamepad.value(Axis::RightZ)),
            ].into_iter().collect();

            gamepads.push(json!({
                "id": format!("{:?}", id),
                "name": gamepad.name(),
                "buttons": buttons.into_iter().map(|(name, pressed)| {
                    json!({ "name": name, "pressed": pressed })
                }).collect::<Vec<_>>(),
                "axes": axes.into_iter().map(|(name, value)| {
                    json!({ "name": name, "value": value })
                }).collect::<Vec<_>>()
            }));
        }

        json_response(&json!({
            "success": true,
            "gamepads": gamepads
        }))
    } else {
        json_response(&json!({
            "success": false,
            "error": "Gamepad system not available"
        }))
    }
}

// ============================================
// SCREENSHOT & COLOR PICKER
// ============================================
use screenshots::Screen;

pub async fn handle_screenshot_displays() -> HttpResponse {
    let screens = Screen::all().unwrap_or_default();

    let displays: Vec<serde_json::Value> = screens.iter().enumerate().map(|(i, screen)| {
        let info = screen.display_info;
        json!({
            "id": i,
            "x": info.x,
            "y": info.y,
            "width": info.width,
            "height": info.height,
            "scale_factor": info.scale_factor,
            "is_primary": info.is_primary
        })
    }).collect();

    json_response(&json!({
        "displays": displays
    }))
}

#[derive(Deserialize)]
struct ScreenshotRequest {
    display_id: Option<usize>,
    x: Option<i32>,
    y: Option<i32>,
    width: Option<u32>,
    height: Option<u32>,
}

pub async fn handle_screenshot(req: HttpRequest) -> HttpResponse {
    let params: ScreenshotRequest = req.body_json().unwrap_or(ScreenshotRequest {
        display_id: None,
        x: None,
        y: None,
        width: None,
        height: None,
    });

    let screens = Screen::all().unwrap_or_default();
    let display_id = params.display_id.unwrap_or(0);

    if let Some(screen) = screens.get(display_id) {
        let image = if let (Some(x), Some(y), Some(w), Some(h)) = (params.x, params.y, params.width, params.height) {
            screen.capture_area(x, y, w, h)
        } else {
            screen.capture()
        };

        match image {
            Ok(img) => {
                let width = img.width();
                let height = img.height();
                let raw_data: Vec<u8> = img.into_raw();

                // Create our own image from raw data
                if let Some(our_img) = image::RgbaImage::from_raw(width, height, raw_data) {
                    let mut png_data = Vec::new();
                    let mut cursor = Cursor::new(&mut png_data);
                    let dyn_img = image::DynamicImage::ImageRgba8(our_img);

                    if dyn_img.write_to(&mut cursor, image::ImageFormat::Png).is_ok() {
                        let base64_str = base64::Engine::encode(
                            &base64::engine::general_purpose::STANDARD,
                            &png_data
                        );
                        return json_response(&json!({
                            "success": true,
                            "image": format!("data:image/png;base64,{}", base64_str),
                            "width": width,
                            "height": height
                        }));
                    }
                }

                json_response(&json!({
                    "success": false,
                    "error": "Failed to encode image"
                }))
            }
            Err(e) => {
                json_response(&json!({
                    "success": false,
                    "error": format!("Screenshot failed: {}", e)
                }))
            }
        }
    } else {
        json_response(&json!({
            "success": false,
            "error": "Display not found"
        }))
    }
}

pub async fn handle_color_picker(req: HttpRequest) -> HttpResponse {
    // Get mouse position and capture single pixel
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
    use windows::Win32::Foundation::POINT;

    let mut point = POINT::default();
    unsafe {
        if GetCursorPos(&mut point).is_ok() {
            let screens = Screen::all().unwrap_or_default();

            // Find which screen contains this point
            for screen in &screens {
                let info = screen.display_info;
                let screen_x = info.x;
                let screen_y = info.y;
                let screen_w = info.width as i32;
                let screen_h = info.height as i32;

                if point.x >= screen_x && point.x < screen_x + screen_w &&
                   point.y >= screen_y && point.y < screen_y + screen_h {
                    // Capture a small area around cursor
                    let local_x = point.x - screen_x;
                    let local_y = point.y - screen_y;

                    if let Ok(img) = screen.capture_area(local_x, local_y, 1, 1) {
                        // Get the raw rgba data
                        let raw_data: Vec<u8> = img.into_raw();
                        if raw_data.len() >= 4 {
                            let r = raw_data[0];
                            let g = raw_data[1];
                            let b = raw_data[2];
                            let hex = format!("#{:02X}{:02X}{:02X}", r, g, b);

                            return json_response(&json!({
                                "success": true,
                                "x": point.x,
                                "y": point.y,
                                "color": {
                                    "r": r,
                                    "g": g,
                                    "b": b,
                                    "hex": hex
                                }
                            }));
                        }
                    }
                }
            }
        }
    }

    json_response(&json!({
        "success": false,
        "error": "Could not get cursor position or capture color"
    }))
}

// ============================================
// SYNTHESIZER
// ============================================
use rodio::Source;
use std::time::Duration;
use std::sync::mpsc::{self, Sender};

enum SynthCommand {
    Play { frequency: f32, waveform: String, duration_ms: Option<u64>, volume: f32 },
    Stop,
}

static SYNTH_SENDER: Lazy<Mutex<Option<Sender<SynthCommand>>>> = Lazy::new(|| {
    // Spawn a dedicated audio thread
    let (tx, rx) = mpsc::channel::<SynthCommand>();

    std::thread::spawn(move || {
        use rodio::{OutputStream, Sink};

        // Create output stream on this thread (it must stay on this thread)
        let (_stream, handle) = match OutputStream::try_default() {
            Ok(s) => s,
            Err(_) => return, // Audio not available
        };

        let mut current_sink: Option<Sink> = None;

        loop {
            match rx.recv() {
                Ok(SynthCommand::Play { frequency, waveform, duration_ms, volume }) => {
                    // Stop existing
                    if let Some(sink) = current_sink.take() {
                        sink.stop();
                    }

                    // Create new sink and play
                    if let Ok(sink) = Sink::try_new(&handle) {
                        sink.set_volume(volume);
                        let osc = Oscillator::new(frequency, waveform, duration_ms);
                        sink.append(osc);
                        current_sink = Some(sink);
                    }
                }
                Ok(SynthCommand::Stop) => {
                    if let Some(sink) = current_sink.take() {
                        sink.stop();
                    }
                }
                Err(_) => break, // Channel closed
            }
        }
    });

    Mutex::new(Some(tx))
});

#[derive(Deserialize)]
struct SynthRequest {
    frequency: f32,
    duration_ms: Option<u64>,
    waveform: Option<String>, // "sine", "square", "sawtooth", "triangle"
    volume: Option<f32>,
}

// Custom oscillator source
struct Oscillator {
    frequency: f32,
    sample_rate: u32,
    phase: f32,
    waveform: String,
    duration_samples: Option<u64>,
    samples_played: u64,
}

impl Oscillator {
    fn new(frequency: f32, waveform: String, duration_ms: Option<u64>) -> Self {
        let sample_rate = 44100;
        Oscillator {
            frequency,
            sample_rate,
            phase: 0.0,
            waveform,
            duration_samples: duration_ms.map(|ms| (sample_rate as u64 * ms) / 1000),
            samples_played: 0,
        }
    }
}

impl Iterator for Oscillator {
    type Item = f32;

    fn next(&mut self) -> Option<f32> {
        if let Some(duration) = self.duration_samples {
            if self.samples_played >= duration {
                return None;
            }
        }
        self.samples_played += 1;

        let value = match self.waveform.as_str() {
            "square" => {
                if self.phase < 0.5 { 1.0 } else { -1.0 }
            }
            "sawtooth" => {
                2.0 * self.phase - 1.0
            }
            "triangle" => {
                if self.phase < 0.5 {
                    4.0 * self.phase - 1.0
                } else {
                    3.0 - 4.0 * self.phase
                }
            }
            _ => { // sine
                (self.phase * 2.0 * std::f32::consts::PI).sin()
            }
        };

        self.phase += self.frequency / self.sample_rate as f32;
        if self.phase >= 1.0 {
            self.phase -= 1.0;
        }

        Some(value * 0.3) // Reduce volume to avoid clipping
    }
}

impl Source for Oscillator {
    fn current_frame_len(&self) -> Option<usize> {
        None
    }

    fn channels(&self) -> u16 {
        1
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    fn total_duration(&self) -> Option<Duration> {
        self.duration_samples.map(|s| Duration::from_secs_f64(s as f64 / self.sample_rate as f64))
    }
}

pub async fn handle_synth_play(req: HttpRequest) -> HttpResponse {
    let body: SynthRequest = match req.body_json() {
        Ok(v) => v,
        Err(e) => {
            return json_response(&json!({
                "success": false,
                "error": format!("Invalid request: {}", e)
            }));
        }
    };

    let waveform = body.waveform.unwrap_or_else(|| "sine".to_string());
    let volume = body.volume.unwrap_or(0.5).clamp(0.0, 1.0);

    let sender_guard = SYNTH_SENDER.lock();
    if let Some(ref sender) = *sender_guard {
        match sender.send(SynthCommand::Play {
            frequency: body.frequency,
            waveform: waveform.clone(),
            duration_ms: body.duration_ms,
            volume,
        }) {
            Ok(_) => {
                json_response(&json!({
                    "success": true,
                    "frequency": body.frequency,
                    "waveform": waveform,
                    "duration_ms": body.duration_ms
                }))
            }
            Err(e) => {
                json_response(&json!({
                    "success": false,
                    "error": format!("Failed to send play command: {}", e)
                }))
            }
        }
    } else {
        json_response(&json!({
            "success": false,
            "error": "Audio output not available"
        }))
    }
}

pub async fn handle_synth_stop(_req: HttpRequest) -> HttpResponse {
    let sender_guard = SYNTH_SENDER.lock();
    if let Some(ref sender) = *sender_guard {
        let _ = sender.send(SynthCommand::Stop);
    }

    json_response(&json!({
        "success": true,
        "message": "Synth stopped"
    }))
}

// ============================================
// SPEED TEST
// ============================================
#[derive(Deserialize)]
struct SpeedTestRequest {
    size_mb: Option<u32>,
}

pub async fn handle_speedtest_download(req: HttpRequest) -> HttpResponse {
    let body: SpeedTestRequest = req.body_json().unwrap_or(SpeedTestRequest { size_mb: None });
    let size_mb = body.size_mb.unwrap_or(10).min(100); // Max 100MB

    // Use a reliable speed test endpoint (Cloudflare's speed test)
    let url = format!("https://speed.cloudflare.com/__down?bytes={}", size_mb * 1024 * 1024);

    let start = std::time::Instant::now();

    match reqwest::blocking::get(&url) {
        Ok(response) => {
            let bytes = response.bytes().unwrap_or_default();
            let elapsed = start.elapsed();
            let size_bytes = bytes.len();

            let speed_mbps = (size_bytes as f64 * 8.0) / elapsed.as_secs_f64() / 1_000_000.0;

            json_response(&json!({
                "success": true,
                "size_bytes": size_bytes,
                "time_ms": elapsed.as_millis(),
                "speed_mbps": speed_mbps
            }))
        }
        Err(e) => {
            json_response(&json!({
                "success": false,
                "error": format!("Download failed: {}", e)
            }))
        }
    }
}

pub async fn handle_speedtest_upload(req: HttpRequest) -> HttpResponse {
    let body: SpeedTestRequest = req.body_json().unwrap_or(SpeedTestRequest { size_mb: None });
    let size_mb = body.size_mb.unwrap_or(25).min(100); // Max 100MB for upload

    // Generate random data to upload
    let data: Vec<u8> = (0..size_mb * 1024 * 1024).map(|_| rand::random::<u8>()).collect();
    let size_bytes = data.len();

    let url = "https://speed.cloudflare.com/__up";

    let client = reqwest::blocking::Client::new();
    let start = std::time::Instant::now();

    match client.post(url).body(data).send() {
        Ok(_) => {
            let elapsed = start.elapsed();
            let speed_mbps = (size_bytes as f64 * 8.0) / elapsed.as_secs_f64() / 1_000_000.0;

            json_response(&json!({
                "success": true,
                "size_bytes": size_bytes,
                "time_ms": elapsed.as_millis(),
                "speed_mbps": speed_mbps
            }))
        }
        Err(e) => {
            json_response(&json!({
                "success": false,
                "error": format!("Upload failed: {}", e)
            }))
        }
    }
}
