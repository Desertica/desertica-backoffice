# Proteccion de ramas

Hoy el repo tiene una sola rama protegible: `main`. Si creas otras ramas de larga vida (por ejemplo `develop`), repite estos pasos para cada una. Las ramas de trabajo (`feature/*`, `chore/*`) no se protegen.

## Antes de empezar

1. Copia `docs/pipelines/ci.yml` a `.github/workflows/ci.yml` (en un PR) y espera a que corra al menos una vez: GitHub solo ofrece como requeridos los checks que ya se ejecutaron.
2. Gitleaks: en una organizacion necesita un secret. Settings -> Secrets and variables -> Actions -> New repository secret, nombre `GITLEAKS_LICENSE` (licencia gratuita en gitleaks.io). Sin ella el check `Secretos` falla.

## Pasos (necesitas ser admin del repo)

1. GitHub -> repo `Desertica/desertica-backoffice` -> **Settings** -> **Branches**.
2. En "Branch protection rules" pulsa **Add branch ruleset** (o **Add classic branch protection rule**) y pon el patron `main`.
3. Marca **Require a pull request before merging** y, dentro, **Require approvals** = 1.
4. Marca **Require status checks to pass before merging** y **Require branches to be up to date before merging**.
5. En el buscador de checks agrega exactamente estos tres:
   - `Secretos`
   - `Reglas del repo`
   - `Node`
6. Marca **Do not allow bypassing the above settings** (o "Include administrators") y deja desmarcado permitir force pushes y borrar la rama.
7. **Create** / **Save changes**.

## Notas

- `Node` pasa en verde sin codigo (dice "Sin package.json") y empieza a validar solo cuando llega `package.json`.
- `npm audit` es informativo (no bloquea). Cuando este en verde, quita `continue-on-error: true` de ese paso en el workflow.
- Dependabot (`.github/dependabot.yml`) abre PRs semanales agrupados de npm y github-actions.
