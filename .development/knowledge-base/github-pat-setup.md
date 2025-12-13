# GitHub Personal Access Token Setup

## Current Status
- ✅ **Classic PAT:** Working (currently in use)
- ⚠️ **Fine-grained PAT:** Read-only (needs write permissions)

---

## Fix Fine-grained PAT Permissions

### Step 1: Update Fine-grained PAT Permissions

1. **Go to GitHub Settings:**
   - https://github.com/settings/tokens?type=beta

2. **Find your Fine-grained PAT:**
   - Name: (look for the token starting with `github_pat_11A6MPREQ0...`)
   - Click **Edit** or **Regenerate**

3. **Configure Repository Access:**
   - **Repository access:** Select "Only select repositories"
   - **Selected repositories:** Choose `Posteriot/makalah-app`

4. **Configure Permissions:**
   Under **Repository permissions**, set:
   - ✅ **Contents:** Read and write
   - ✅ **Metadata:** Read-only (required)
   - ✅ **Pull requests:** Read and write (optional, for PR workflows)
   - ✅ **Workflows:** Read and write (if using GitHub Actions)

5. **Save Changes:**
   - Click **Update token** or **Generate token**
   - If regenerated, copy the new token and update `.env.local`

### Step 2: Test Fine-grained PAT

```bash
# Test read access
curl -H "Authorization: token YOUR_FINE_GRAINED_PAT" \
  https://api.github.com/repos/Posteriot/makalah-app

# Should return repo details without error
```

### Step 3: Switch to Fine-grained PAT (Optional)

```bash
# Clear current credentials
printf "protocol=https\nhost=github.com\n\n" | git credential-osxkeychain erase

# Store Fine-grained PAT
printf "protocol=https\nhost=github.com\nusername=Posteriot\npassword=YOUR_FINE_GRAINED_PAT\n\n" | git credential-osxkeychain store

# Test push
git push origin main
```

---

## Current Configuration (Working)

**Active PAT:** Classic PAT (`ghp_uBY...`)
**Stored in:** macOS Keychain
**Username:** Posteriot
**Repository:** https://github.com/Posteriot/makalah-app.git

**Git Config:**
```bash
git config --global user.name   # makalah-app
git config --global user.email  # makalah.app@gmail.com
```

---

## Why Classic PAT Works but Fine-grained Doesn't?

**Classic PAT:**
- ✅ Has broad `repo` scope (read + write)
- ✅ Works for all repositories user has access to
- ⚠️ Less secure (broad permissions)

**Fine-grained PAT:**
- ✅ More secure (granular permissions)
- ✅ Repository-specific access
- ❌ Needs explicit "Contents: Write" permission
- ❌ Current token likely only has "Contents: Read"

---

## Recommendation

**For this project:**
1. ✅ Keep using Classic PAT (already working)
2. ⏳ Update Fine-grained PAT permissions for future use
3. 🔄 Consider switching to Fine-grained PAT once configured (more secure)

**Security Best Practice:**
- Use Fine-grained PAT with minimal required permissions
- Rotate tokens every 90 days
- Never commit tokens to repository
- Store tokens in `.env.local` (gitignored)
