import os
import requests
from urllib.parse import urljoin, urlparse

def download_assets(urls, output_dir="assets"):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"📁 Created directory: {output_dir}")

    for url in urls:
        try:
            filename = os.path.basename(urlparse(url).path)
            if not filename:
                continue
            
            filepath = os.path.join(output_dir, filename)
            
            response = requests.get(url, stream=True, timeout=10)
            if response.status_code == 200:
                with open(filepath, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                print(f"✅ Downloaded: {filename}")
            else:
                print(f"❌ Failed ({response.status_code}): {url}")
        except Exception as e:
            print(f"⚠️ Error downloading {url}: {e}")

if __name__ == "__main__":
    # Example usage:
    # asset_urls = ["https://example.com/logo.svg", "https://example.com/hero.png"]
    # download_assets(asset_urls)
    print("🚀 Asset Downloader Ready. Modify list of URLs in the script or import it.")
