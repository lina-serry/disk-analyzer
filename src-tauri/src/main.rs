// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(non_snake_case)]

extern crate chrono;
extern crate clap;
extern crate diskscan;
extern crate filesize;
extern crate fs_extra;
extern crate libc;
extern crate rayon;
extern crate serde_json;
extern crate std;
extern crate sysinfo;
extern crate walkdir;
use serde::{Deserialize, Serialize};
extern crate glob;
use rayon::prelude::*;
use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri;
use walkdir::WalkDir;
// use sysinfo::{DiskExt, DiskKind, System, SystemExt};

#[derive(Serialize, Deserialize)]
pub struct Content {
    pub name: String,
    pub size: u64,
    pub Accessed: u64,
    pub file_type: bool,
}

// The main Info for Directory
#[derive(Serialize, Deserialize, Clone, Debug)]
struct DirectoryInfo {
    path: PathBuf,
    size_bytes: u64,
    size_kilobytes: f64,
    size_megabytes: f64,
    size_gigabytes: f64,
    indentation: String,
    name: String,
    file_type: String,
}

// Largest files Info
#[derive(Serialize, Deserialize, Clone, Debug)]
struct LargestFileInfo {
    path: PathBuf,
    size_bytes: u64,
    size_kilobytes: f64,
    size_megabytes: f64,
    size_gigabytes: f64,
    name: String,
}

//save to file
#[derive(Serialize)]
struct SaveDataResponse {
    success: bool,
    message: String,
}

#[tauri::command]
fn save_data_to_file(path: &Path, data: Vec<DirectoryInfo>) -> SaveDataResponse {
    match OpenOptions::new().write(true).open(path) {
        Ok(mut file) => {
            writeln!(
                file,
                " Directory\t\t\tSize (GB)\n -----------------------------------------"
            )
            .unwrap();
            for item in data {
                if let Err(e) = writeln!(file, " {}\t\t\t{} GB", item.name, item.size_gigabytes) {
                    return SaveDataResponse {
                        success: false,
                        message: format!("Error writing to file: {}", e),
                    };
                }
            }
            SaveDataResponse {
                success: true,
                message: String::from("Data saved successfully"),
            }
        }
        Err(e) => SaveDataResponse {
            success: false,
            message: format!("Error creating file: {}", e),
        },
    }
}

//Conversion for Sizes
fn bytes_to_megabytes(bytes: u64) -> f64 {
    bytes as f64 / 1_000_000.0
}

fn bytes_to_kilobytes(bytes: u64) -> f64 {
    bytes as f64 / 1_000.0
}

fn bytes_to_gigabytes(bytes: u64) -> f64 {
    bytes as f64 / 1_000_000_000.0
}

// function elly btremove files
#[tauri::command]
fn delete_file(path: &str) {
    fs::remove_file(path);
}

#[tauri::command]
fn copy_contents(path1: &str, destination: &str) {
    fs::copy(path1, destination);
}

#[tauri::command]
// fn print_disk_info() {
//     let mut system = System::new_all();
//     let mut Storage: Vec<f64> = Vec::new();
//     let mut FreeStorage: Vec<f64> = Vec::new();
//     let mut usedStorage: Vec<f64> = Vec::new();
//     let mut DiskName: Vec<String> = Vec::new();
//     let mut DiskType: Vec<DiskKind> = Vec::new();

//     // Refresh system information
//     system.refresh_all();

//     // Get the first disk (assuming it's the root disk)
//     if let Some(disk) = system.disks().iter().next() {
//         // ba store el main storage hena
//         Storage.push(bytes_to_gigabytes(disk.total_space()));
//         FreeStorage.push(bytes_to_gigabytes(disk.available_space()));
//         usedStorage.push(bytes_to_gigabytes(
//             disk.total_space() - disk.available_space(),
//         ));
//         DiskName.push(disk.name().to_string_lossy().to_string());
//         DiskType.push(disk.kind());

//         println!("Total space: {} GigaBytes", Storage[0]);
//         println!("Free space: {} GigaBytes", FreeStorage[0]);
//         println!("Used space: {} GigaBytes", usedStorage[0]);
//         println!("Disk Name: {}", DiskName[0]);
//         println!("Disk Type: {:?} ", DiskType);
//     } else {
//         println!("No disks found");
//     }
// }

fn calculate_directory_size(path: &Path, indentation: &str) -> DirectoryInfo {
    let mut total_size = 0;

    for entry in WalkDir::new(path) {
        if let Ok(entry) = entry {
            let entry_path = entry.path();

            if entry_path.is_file() {
                if let Ok(metadata) = fs::metadata(&entry_path) {
                    total_size += metadata.len();
                }
            }
        }
    }

    let size_gigabytes = bytes_to_gigabytes(total_size);
    let size_megabytes = bytes_to_megabytes(total_size);
    let size_kilobytes = bytes_to_kilobytes(total_size);

    DirectoryInfo {
        path: path.to_path_buf(),
        size_bytes: total_size,
        size_kilobytes,
        size_megabytes,
        size_gigabytes,
        indentation: indentation.to_string(),
        name: path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        file_type: " ".to_string(),
    }
}

#[tauri::command]
fn store_directories(path: &Path) -> (Vec<DirectoryInfo>) {
    let mut dir_infos: Vec<DirectoryInfo> = Vec::new();
    let mut prev_depth = 0; // Keep track of the previous depth

    for entry in WalkDir::new(path)
        .min_depth(1)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let entry_path = entry.path();
        let depth = entry.depth();
        let indentation = "    ".repeat(depth); // indentation bn3rf meen el subfile we men el folder
        let info = calculate_directory_size(&entry_path, "    ");

        // let is_file = entry.metadata().map(|m| m.is_file()).unwrap_or(false);
        // let is_dir = entry.metadata().map(|m| m.is_dir()).unwrap_or(false);
        // let is_symlink = entry.metadata().map(|m| m.is_symlink()).unwrap_or(false);

        // Check if the depth increased, indicating a new subdirectory
        // let is_child = depth > prev_depth;
        // prev_depth = depth;

        // println!(
        //     "{}{} ({} KB, {} MB, {} GB)",
        //     info.indentation,
        //     entry_path
        //         .file_name()
        //         .unwrap_or_default()
        //         .to_string_lossy()
        //         .to_string(),
        //     info.size_kilobytes,
        //     info.size_megabytes,
        //     info.size_gigabytes
        // );

        // let file_name = entry_path.file_name().unwrap_or_default().to_string_lossy();
        let file_extension = entry_path.extension().map(|ext| ext.to_string_lossy());

        let file_type = match file_extension {
            Some(ext) => ext.to_string(),
            None => "Unknown".to_string(),
        };

        let dir_info = DirectoryInfo {
            path: entry_path.to_path_buf(),
            size_bytes: info.size_bytes,
            size_kilobytes: info.size_kilobytes,
            size_megabytes: info.size_megabytes,
            size_gigabytes: info.size_gigabytes,
            indentation: indentation.clone(),
            name: info.name,
            file_type: file_type,
        };

        dir_infos.push(dir_info); // aham vector hena (El directories)
    }

    (dir_infos)
}

#[tauri::command]
fn scan_largest(path: &Path) -> Vec<LargestFileInfo> {
    let largest_files: Vec<LargestFileInfo> = WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .par_bridge()
        .filter(|entry| entry.metadata().map(|m| m.is_file()).unwrap_or(false))
        .map(|entry| {
            let entry_path = entry.path();
            let mut total_size = 0;

            if let Ok(metadata) = fs::metadata(&entry_path) {
                total_size += metadata.len();
            }

            let size_gigabytes = bytes_to_gigabytes(total_size);
            let size_megabytes = bytes_to_megabytes(total_size);
            let size_kilobytes = bytes_to_kilobytes(total_size);

            LargestFileInfo {
                path: entry_path.to_path_buf(),
                size_bytes: total_size,
                size_kilobytes,
                size_megabytes,
                size_gigabytes,
                name: entry_path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
            }
        })
        .collect();

    let mut sorted_files = largest_files.clone();
    sorted_files.par_sort_unstable_by(|a, b| b.size_bytes.cmp(&a.size_bytes));

    let top_5_largest: Vec<LargestFileInfo> = sorted_files.into_iter().take(5).collect();

    for info in &top_5_largest {
        println!(
            "{} ,{} KB, {} MB, {} GB)",
            info.name, info.size_kilobytes, info.size_megabytes, info.size_gigabytes
        );
    }

    top_5_largest
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            store_directories,
            //print_disk_info,
            save_data_to_file,
            scan_largest,
            delete_file,
            copy_contents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
