import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import App from './App'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}))

const adminApiMocks = vi.hoisted(() => ({
  setWritesLocked: vi.fn(),
  getLocalProductionSafetyStatus: vi.fn(),
  listResource: vi.fn(),
  getSemesterUsage: vi.fn(),
  listStorageBuckets: vi.fn(),
  listStorageObjects: vi.fn(),
  createResource: vi.fn(),
  createNewsletterSignup: vi.fn(),
  updateResource: vi.fn(),
  deleteResource: vi.fn(),
  replaceEventFlyer: vi.fn(),
  replaceBoardHeadshot: vi.fn(),
  uploadStorageObject: vi.fn(),
  updateStorageObject: vi.fn(),
  deleteStorageObjects: vi.fn(),
}))

const mediaMocks = vi.hoisted(() => ({
  createMediaVariants: vi.fn(),
  getJsonByteSize: vi.fn(),
}))

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
      signInWithPassword: authMocks.signInWithPassword,
      signOut: authMocks.signOut,
    },
  },
}))

vi.mock('./lib/adminApi', async () => {
  const actual = await vi.importActual<typeof import('./lib/adminApi')>('./lib/adminApi')
  return {
    ...actual,
    createAdminApiClient: () => ({
      setWritesLocked: adminApiMocks.setWritesLocked,
      getLocalProductionSafetyStatus: adminApiMocks.getLocalProductionSafetyStatus,
      listResource: adminApiMocks.listResource,
      getSemesterUsage: adminApiMocks.getSemesterUsage,
      listStorageBuckets: adminApiMocks.listStorageBuckets,
      listStorageObjects: adminApiMocks.listStorageObjects,
      createResource: adminApiMocks.createResource,
      createNewsletterSignup: adminApiMocks.createNewsletterSignup,
      updateResource: adminApiMocks.updateResource,
      deleteResource: adminApiMocks.deleteResource,
      replaceEventFlyer: adminApiMocks.replaceEventFlyer,
      replaceBoardHeadshot: adminApiMocks.replaceBoardHeadshot,
      uploadStorageObject: adminApiMocks.uploadStorageObject,
      updateStorageObject: adminApiMocks.updateStorageObject,
      deleteStorageObjects: adminApiMocks.deleteStorageObjects,
    }),
  }
})

vi.mock('./lib/adminMedia', async () => {
  const actual = await vi.importActual<typeof import('./lib/adminMedia')>('./lib/adminMedia')
  return {
    ...actual,
    createMediaVariants: mediaMocks.createMediaVariants,
    getJsonByteSize: mediaMocks.getJsonByteSize,
  }
})

const session = {
  access_token: 'access-token',
  user: { email: 'admin@sjba.org' },
} as Session

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    authMocks.getSession.mockReset()
    authMocks.onAuthStateChange.mockReset()
    authMocks.signInWithPassword.mockReset()
    authMocks.signOut.mockReset()
    authMocks.signOut.mockResolvedValue({ error: null })
    adminApiMocks.getLocalProductionSafetyStatus.mockReset()
    adminApiMocks.setWritesLocked.mockReset()
    adminApiMocks.listResource.mockReset()
    adminApiMocks.getSemesterUsage.mockReset()
    adminApiMocks.listStorageBuckets.mockReset()
    adminApiMocks.listStorageObjects.mockReset()
    adminApiMocks.createResource.mockReset()
    adminApiMocks.createNewsletterSignup.mockReset()
    adminApiMocks.updateResource.mockReset()
    adminApiMocks.deleteResource.mockReset()
    adminApiMocks.replaceEventFlyer.mockReset()
    adminApiMocks.replaceBoardHeadshot.mockReset()
    adminApiMocks.uploadStorageObject.mockReset()
    adminApiMocks.updateStorageObject.mockReset()
    adminApiMocks.deleteStorageObjects.mockReset()
    authMocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    adminApiMocks.getLocalProductionSafetyStatus.mockResolvedValue({
      checked: true,
      readOnly: false,
      reasons: [],
      backendUrl: '/v1',
      backendHealthUrl: 'http://localhost/health',
      backendEnvironment: 'development',
    })
    adminApiMocks.listResource.mockResolvedValue([])
    adminApiMocks.getSemesterUsage.mockResolvedValue({ semesterId: '', events: 0, members: 0 })
    adminApiMocks.listStorageBuckets.mockResolvedValue([])
    adminApiMocks.listStorageObjects.mockResolvedValue([])
    adminApiMocks.createResource.mockResolvedValue({})
    adminApiMocks.createNewsletterSignup.mockResolvedValue({})
    adminApiMocks.updateResource.mockResolvedValue({})
    adminApiMocks.deleteResource.mockResolvedValue({})
    adminApiMocks.replaceEventFlyer.mockResolvedValue({
      event: { id: 'event-1', flyerFile: 'event-1.png' },
      flyer: {
        fullSizeUrl: 'https://example.com/event-1.png?v=1',
        thumbnailUrl: 'https://example.com/thumbnails/event-1.jpg?v=1',
      },
    })
    adminApiMocks.replaceBoardHeadshot.mockResolvedValue({
      boardMember: { id: 'board-1', headshotFile: 'board-1.png' },
      headshot: {
        fullSizeUrl: 'https://example.com/board-1.png?v=1',
        thumbnailUrl: 'https://example.com/thumbnails/board-1.jpg?v=1',
      },
    })
    adminApiMocks.uploadStorageObject.mockResolvedValue({
      path: 'image.jpg',
      publicUrl: 'image.jpg',
    })
    adminApiMocks.updateStorageObject.mockResolvedValue({ path: 'renamed.jpg' })
    adminApiMocks.deleteStorageObjects.mockResolvedValue({ paths: [] })
    mediaMocks.createMediaVariants.mockReset()
    mediaMocks.createMediaVariants.mockResolvedValue({
      fullSize: new File(['full'], 'image.png', { type: 'image/png' }),
      thumbnail: new File(['thumb'], 'image.jpg', { type: 'image/jpeg' }),
    })
    mediaMocks.getJsonByteSize.mockReset()
    mediaMocks.getJsonByteSize.mockReturnValue(1024)
  })

  it('renders the login form when no Supabase session exists', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } })

    render(<App />)

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders the protected admin dashboard for an active session', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })

    render(<App />)

    expect(await screen.findByText('admin@sjba.org')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /overview/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^refresh$/i })).toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: /admin sections/i })
    expect(within(navigation).getByRole('button', { name: /events/i })).toBeInTheDocument()
    expect(within(navigation).getByRole('button', { name: /site config/i })).toBeInTheDocument()
  })

  it('opens the mobile admin menu and navigates to an object', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    const user = userEvent.setup()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: /open admin menu/i }))
    const mobileNavigation = screen.getByRole('navigation', { name: /mobile admin sections/i })
    await user.click(within(mobileNavigation).getByRole('button', { name: /^events$/i }))

    expect(await screen.findByRole('heading', { name: /^events$/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: /mobile admin sections/i })
    ).not.toBeInTheDocument()
  })

  it('submits Supabase password login credentials', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } })
    authMocks.signInWithPassword.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    render(<App />)

    await user.type(await screen.findByLabelText(/email/i), 'admin@sjba.org')
    await user.type(screen.getByLabelText(/password/i), 'secret-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@sjba.org',
        password: 'secret-password',
      })
    })
  })

  it('opens the site config CRUD screen and create form', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /site config/i }))
    expect(screen.getByRole('heading', { name: /site config/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /create site config value/i }))
    expect(
      await screen.findByRole('heading', { name: /create site config value/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^key/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^value/i })).toBeInTheDocument()
  })

  it('keeps local dev read-only when backend safety check reports production', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.getLocalProductionSafetyStatus.mockResolvedValue({
      checked: true,
      readOnly: true,
      reasons: ['Backend /health reports environment=production.'],
      backendUrl: 'https://api.nyu-sjba.org/v1',
      backendHealthUrl: 'https://api.nyu-sjba.org/health',
      backendEnvironment: 'production',
    })
    const user = userEvent.setup()

    render(<App />)

    expect(
      await screen.findByText(/local admin is read-only for production data/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/production data is visible for inspection/i)).toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /events/i }))
    expect(await screen.findByRole('heading', { name: /events/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create event/i })).toBeDisabled()
    await waitFor(() => {
      expect(adminApiMocks.setWritesLocked).toHaveBeenLastCalledWith(true)
    })
    expect(adminApiMocks.listResource).toHaveBeenCalledWith('events')
  })

  it('shows live overview counts and event snapshots, then opens a resource card', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) => {
      if (resource === 'events') {
        return Promise.resolve([
          {
            id: 'past-event',
            title: 'Past Panel',
            startTime: '2025-01-01T18:00:00.000Z',
            semester: 'S25',
          },
          {
            id: 'future-event',
            title: 'Future Panel',
            startTime: '2099-01-01T18:00:00.000Z',
            semester: 'S99',
          },
        ])
      }
      if (resource === 'site-config') {
        return Promise.resolve([
          { key: 'mentorship_application_open', value: 'true', updatedAt: '' },
          { key: 'mentorship_application_url', value: 'https://example.com', updatedAt: '' },
        ])
      }
      return Promise.resolve([])
    })
    const user = userEvent.setup()

    render(<App />)

    expect(await screen.findByText('Past Panel')).toBeInTheDocument()
    expect(screen.getByText('Future Panel')).toBeInTheDocument()
    const eventsCard = screen.getByRole('button', { name: /2 events/i })
    await user.click(eventsCard)
    expect(await screen.findByRole('heading', { name: /^events$/i })).toBeInTheDocument()
  })

  it('sorts every resource table by clicking column headers', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) =>
      Promise.resolve(
        resource === 'members'
          ? [
              { id: '1', firstName: 'Zoe', lastName: 'Zulu', semester: 'S26', email: null },
              { id: '2', firstName: 'Amy', lastName: 'Alpha', semester: 'S26', email: null },
            ]
          : []
      )
    )
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^members$/i }))
    const firstNameHeader = await screen.findByRole('columnheader', { name: /first name/i })
    await user.click(within(firstNameHeader).getByRole('button'))
    expect(firstNameHeader).toHaveAttribute('aria-sort', 'ascending')
    await user.click(within(firstNameHeader).getByRole('button'))
    expect(firstNameHeader).toHaveAttribute('aria-sort', 'descending')
  })

  it('keeps the selected table sort after editing a row and returning to the table', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) =>
      Promise.resolve(
        resource === 'members'
          ? [
              { id: '1', firstName: 'Zoe', lastName: 'Zulu', semester: 'S26', email: null },
              { id: '2', firstName: 'Amy', lastName: 'Alpha', semester: 'S26', email: null },
            ]
          : []
      )
    )
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^members$/i }))
    const firstNameHeader = await screen.findByRole('columnheader', { name: /first name/i })
    await user.click(within(firstNameHeader).getByRole('button'))
    await user.click(within(firstNameHeader).getByRole('button'))
    expect(firstNameHeader).toHaveAttribute('aria-sort', 'descending')

    await user.click(screen.getByRole('button', { name: /edit zulu/i }))
    expect(await screen.findByRole('heading', { name: /edit member/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(firstNameHeader).toHaveAttribute('aria-sort', 'descending')

    await user.click(within(navigation).getByRole('button', { name: /^events$/i }))
    await user.click(within(navigation).getByRole('button', { name: /^members$/i }))
    expect(await screen.findByRole('columnheader', { name: /first name/i })).toHaveAttribute(
      'aria-sort',
      'descending'
    )
  })

  it('does not allow admins to create contact requests', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /contact requests/i }))
    expect(await screen.findByRole('heading', { name: /contact requests/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /create contact request/i })
    ).not.toBeInTheDocument()
  })

  it('warns that deleting a newsletter signup does not remove the Mailchimp subscriber', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) =>
      Promise.resolve(
        resource === 'newsletter-signups'
          ? [
              {
                id: 'signup-1',
                firstName: 'Ada',
                lastName: 'Lovelace',
                email: 'ada@nyu.edu',
                createdAt: '2026-07-22T12:00:00.000Z',
              },
            ]
          : []
      )
    )
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /newsletter signups/i }))
    await user.click(await screen.findByRole('button', { name: /edit ada@nyu\.edu/i }))
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    expect(
      await screen.findByText(/does not unsubscribe or remove the person from mailchimp/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete database row only/i })).toBeInTheDocument()
  })

  it('makes clear that creating a newsletter signup subscribes through Mailchimp', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /newsletter signups/i }))
    await user.click(await screen.findByRole('button', { name: /subscribe through mailchimp/i }))

    expect(
      await screen.findByRole('heading', { name: /subscribe to newsletter/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /saving subscribes this person in mailchimp and adds the signup to the admin database/i
      )
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText(/first name/i), 'Ada')
    await user.type(screen.getByLabelText(/last name/i), 'Lovelace')
    await user.type(screen.getByLabelText(/^email/i), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: /subscribe through mailchimp/i }))

    await waitFor(() =>
      expect(adminApiMocks.createNewsletterSignup).toHaveBeenCalledWith({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      })
    )
    expect(adminApiMocks.createResource).not.toHaveBeenCalledWith(
      'newsletter-signups',
      expect.anything()
    )
  })

  it('requires a decision before navigating away from an edited form', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) =>
      Promise.resolve(
        resource === 'events'
          ? [
              {
                id: 'event-1',
                title: 'Original title',
                company: 'SJBA',
                startTime: '2099-01-01T18:00:00.000Z',
                endTime: null,
                location: null,
                semester: 'S99',
                isVisible: true,
                rsvpLink: '#',
                flyerFile: null,
                description: null,
              },
            ]
          : []
      )
    )
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^events$/i }))
    await user.click(await screen.findByRole('button', { name: /edit original title/i }))
    const titleInput = screen.getByRole('textbox', { name: /^title/i })
    await user.clear(titleInput)
    await user.type(titleInput, 'Changed title')
    await user.click(screen.getByRole('button', { name: /^close$/i }))

    expect(
      await screen.findByRole('heading', { name: /discard unsaved changes/i })
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('Changed title')).toBeInTheDocument()
  })

  it('closes the discard prompt and keeps a dirty new-event editor open', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) =>
      Promise.resolve(resource === 'semesters' ? [{ id: 'semester-1', semesterName: 'F26' }] : [])
    )
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^events$/i }))
    await user.click(await screen.findByRole('button', { name: /create event/i }))
    await user.type(screen.getByLabelText(/^title/i), 'New Panel')
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    const discardPrompt = await screen.findByRole('alertdialog', {
      name: /discard unsaved changes/i,
    })
    await user.click(within(discardPrompt).getByRole('button', { name: /continue editing/i }))

    await waitFor(() => expect(discardPrompt).not.toBeInTheDocument())
    await new Promise((resolve) => window.setTimeout(resolve, 600))
    expect(screen.queryByRole('alertdialog', { name: /discard unsaved changes/i })).toBeNull()
    expect(screen.getByRole('heading', { name: /create event/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('New Panel')).toBeInTheDocument()
  })

  it('limits event semesters, derives the end time from event length, and hides media paths', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) => {
      if (resource === 'semesters') {
        return Promise.resolve([
          { id: 'semester-1', semesterName: 'S26' },
          { id: 'semester-2', semesterName: 'F26' },
        ])
      }
      if (resource === 'events') {
        return Promise.resolve([
          {
            id: 'event-1',
            title: 'Spring Panel',
            company: 'SJBA',
            startTime: '2026-04-01T16:00:00.000Z',
            endTime: '2026-04-01T17:00:00.000Z',
            location: 'Stern',
            semester: 'S26',
            isVisible: true,
            rsvpLink: '#',
            flyerFile: 'events/spring-panel.png',
            description: null,
          },
        ])
      }
      return Promise.resolve([])
    })
    adminApiMocks.listStorageObjects.mockImplementation((_bucketId, params) =>
      Promise.resolve([
        {
          name: String(params.prefix).includes('thumbnails')
            ? 'spring-panel.jpg'
            : 'spring-panel.png',
          path: String(params.prefix).includes('thumbnails')
            ? 'events/thumbnails/spring-panel.jpg'
            : 'events/spring-panel.png',
          type: 'file',
          metadata: {},
          publicUrl: 'https://example.com/spring-panel.png',
        },
      ])
    )
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^events$/i }))
    await user.click(await screen.findByRole('button', { name: /edit spring panel/i }))

    expect(screen.queryByLabelText(/end date & time/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /flyer file/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/original image/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^thumbnail$/i)).not.toBeInTheDocument()

    const semesterSelect = await screen.findByRole('combobox', { name: /^semester/i })
    await user.click(semesterSelect)
    expect(await screen.findByRole('option', { name: 'F26' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'S26' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    const durationSelect = screen.getByRole('combobox', { name: /event length/i })
    await user.click(durationSelect)
    await user.click(await screen.findByRole('option', { name: '1 hour 30 minutes' }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(adminApiMocks.updateResource).toHaveBeenCalledWith(
        'events',
        'event-1',
        expect.objectContaining({ semester: 'S26' })
      )
    })
    const payload = adminApiMocks.updateResource.mock.calls[0][2]
    expect(new Date(payload.endTime).getTime() - new Date(payload.startTime).getTime()).toBe(
      90 * 60 * 1000
    )
    expect(payload).not.toHaveProperty('eventDuration')
  })

  it('keeps the editor open after closing an uploaded-image preview', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) =>
      Promise.resolve(
        resource === 'events'
          ? [
              {
                id: 'event-1',
                title: 'Spring Panel',
                company: 'SJBA',
                startTime: '2026-04-01T16:00:00.000Z',
                endTime: '2026-04-01T17:00:00.000Z',
                location: 'Stern',
                semester: 'S26',
                isVisible: true,
                rsvpLink: '#',
                flyerFile: 'events/spring-panel.png',
                description: null,
              },
            ]
          : []
      )
    )
    adminApiMocks.listStorageObjects.mockImplementation((_bucketId, params) =>
      Promise.resolve([
        {
          name: String(params.prefix).includes('thumbnails')
            ? 'spring-panel.jpg'
            : 'spring-panel.png',
          path: String(params.prefix).includes('thumbnails')
            ? 'events/thumbnails/spring-panel.jpg'
            : 'events/spring-panel.png',
          type: 'file',
          metadata: {},
          publicUrl: 'https://example.com/spring-panel.png',
        },
      ])
    )
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^events$/i }))
    await user.click(await screen.findByRole('button', { name: /edit spring panel/i }))
    await user.click(await screen.findByRole('button', { name: /^preview$/i }))

    const previewDialog = await screen.findByRole('dialog', { name: /uploaded image/i })
    await user.click(within(previewDialog).getByRole('button', { name: /^close$/i }))

    await waitFor(() => expect(previewDialog).not.toBeInTheDocument())
    await new Promise((resolve) => window.setTimeout(resolve, 600))
    expect(screen.getByRole('heading', { name: /edit event/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^preview$/i })).toBeInTheDocument()
  })

  it('uses existing semesters when editing members', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) => {
      if (resource === 'semesters') {
        return Promise.resolve([{ id: 'semester-1', semesterName: 'F26' }])
      }
      if (resource === 'members') {
        return Promise.resolve([
          { id: 'member-1', firstName: 'Ada', lastName: 'Lovelace', semester: 'F26', email: null },
        ])
      }
      return Promise.resolve([])
    })
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^members$/i }))
    await user.click(await screen.findByRole('button', { name: /edit lovelace/i }))
    const semesterSelect = await screen.findByRole('combobox', { name: /^semester/i })
    expect(semesterSelect).toHaveTextContent('F26')
    expect(screen.queryByRole('textbox', { name: /^semester/i })).not.toBeInTheDocument()
  })

  it('only creates semester codes that the public frontend can parse', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^semesters$/i }))
    await user.click(await screen.findByRole('button', { name: /create semester/i }))
    const semesterInput = screen.getByRole('textbox', { name: /semester code/i })
    expect(screen.getByText(/use syy for spring or fyy for fall/i)).toBeInTheDocument()

    await user.type(semesterInput, '>!')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(
      await screen.findByText(/semester code must be s or f followed by the last two digits/i)
    ).toBeInTheDocument()
    expect(adminApiMocks.createResource).not.toHaveBeenCalledWith('semesters', expect.anything())

    await user.clear(semesterInput)
    await user.type(semesterInput, 'f27')
    expect(semesterInput).toHaveValue('F27')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(adminApiMocks.createResource).toHaveBeenCalledWith('semesters', {
        semesterName: 'F27',
      })
    )
  })

  it('blocks deleting referenced semesters and allows deleting unused ones', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) => {
      if (resource === 'semesters') {
        return Promise.resolve([
          { id: 'semester-1', semesterName: 'S26' },
          { id: 'semester-2', semesterName: 'F27' },
        ])
      }
      return Promise.resolve([])
    })
    adminApiMocks.getSemesterUsage.mockImplementation((semesterId: string) =>
      Promise.resolve(
        semesterId === 'semester-1'
          ? { semesterId, events: 2, members: 1 }
          : { semesterId, events: 0, members: 0 }
      )
    )
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^semesters$/i }))
    const s26Row = await screen.findByRole('row', { name: /s26/i })
    await user.click(within(s26Row).getByRole('button', { name: /more actions/i }))
    await user.click(await screen.findByRole('menuitem', { name: /^delete$/i }))

    expect(
      await screen.findByText(
        /s26 can’t be deleted because it is assigned to 2 events and 1 member/i
      )
    ).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog', { name: /delete semester/i })).toBeNull()
    expect(adminApiMocks.deleteResource).not.toHaveBeenCalled()

    await user.click(await screen.findByRole('button', { name: /edit s26/i }))

    const s26Editor = await screen.findByRole('dialog', { name: /edit semester/i })
    expect(
      await within(s26Editor).findByText(/assigned to 2 events and 1 member/i)
    ).toBeInTheDocument()
    expect(within(s26Editor).getByRole('button', { name: /^delete$/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    await user.click(await screen.findByRole('button', { name: /edit f27/i }))

    expect(await screen.findByText(/not used by any events or members/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeEnabled()

    adminApiMocks.deleteResource.mockRejectedValueOnce(new Error('Internal server error'))
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    const deleteDialog = await screen.findByRole('alertdialog', { name: /delete semester/i })
    await user.click(within(deleteDialog).getByRole('button', { name: /^delete$/i }))

    expect(
      await screen.findByText(/semester could not be deleted.*still be referenced/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeDisabled()
  })

  it('animates board rows and highlights the destination while reordering', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) =>
      Promise.resolve(
        resource === 'board-members'
          ? [
              {
                id: 'board-1',
                fullName: 'Ada Lovelace',
                position: 'President',
                email: 'ada@example.com',
                orderIndex: 0,
              },
              {
                id: 'board-2',
                fullName: 'Grace Hopper',
                position: 'Vice President',
                email: 'grace@example.com',
                orderIndex: 1,
              },
              {
                id: 'board-3',
                fullName: 'Katherine Johnson',
                position: 'Treasurer',
                email: 'katherine@example.com',
                orderIndex: 2,
              },
            ]
          : []
      )
    )
    const startViewTransition = vi.fn((update: () => void) => {
      update()
      return {}
    })
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    })
    const user = userEvent.setup()

    try {
      render(<App />)

      const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
      await user.click(within(navigation).getByRole('button', { name: /^board$/i }))
      const adaRow = await screen.findByRole('row', { name: /ada lovelace/i })
      const katherineRow = screen.getByRole('row', { name: /katherine johnson/i })
      expect(adaRow).toHaveAttribute('draggable', 'false')
      expect(within(adaRow).getByText('1')).toBeInTheDocument()
      expect(screen.queryByTitle(/drag to reorder/i)).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /reorder board/i }))
      expect(
        within(screen.getByRole('alert')).getByText(/reordering public board order/i)
      ).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /search board/i })).toBeDisabled()
      expect(
        within(screen.getByRole('columnheader', { name: /position/i })).getByRole('button')
      ).toBeDisabled()
      expect(adaRow).toHaveAttribute('draggable', 'true')

      fireEvent.dragStart(adaRow)
      fireEvent.dragEnter(katherineRow)
      expect(adaRow).toHaveAttribute('data-dragging', 'true')
      expect(katherineRow).toHaveAttribute('data-drag-target', 'true')

      fireEvent.dragOver(katherineRow)
      fireEvent.drop(katherineRow)

      expect(startViewTransition).toHaveBeenCalledTimes(1)
      expect(katherineRow).not.toHaveAttribute('data-drag-target')
      await waitFor(() =>
        expect(adminApiMocks.updateResource).toHaveBeenCalledWith('board-members', 'board-1', {
          orderIndex: 2,
        })
      )
    } finally {
      Reflect.deleteProperty(document, 'startViewTransition')
    }
  })

  it('creates an event before uploading UUID-keyed flyer variants through the paired endpoint', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) => {
      if (resource === 'semesters') {
        return Promise.resolve([{ id: 'semester-1', semesterName: 'F26' }])
      }
      return Promise.resolve([])
    })
    adminApiMocks.createResource.mockResolvedValue({
      id: 'event-new',
      title: 'Fall Panel',
      flyerFile: null,
      updatedAt: '2026-07-22T16:00:00.000Z',
    })
    adminApiMocks.replaceEventFlyer.mockResolvedValue({
      event: {
        id: 'event-new',
        title: 'Fall Panel',
        flyerFile: 'event-new.png',
        updatedAt: '2026-07-22T16:01:00.000Z',
      },
      flyer: {
        fullSizeUrl: 'https://example.com/event-new.png?v=2',
        thumbnailUrl: 'https://example.com/thumbnails/event-new.jpg?v=2',
      },
    })
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^events$/i }))
    await user.click(await screen.findByRole('button', { name: /create event/i }))
    await user.type(screen.getByLabelText(/^title/i), 'Fall Panel')
    await user.type(screen.getByLabelText(/start date & time/i), '2026-09-01T17:00')
    const locationInput = screen.getByLabelText(/^location/i)
    expect(locationInput).toBeRequired()
    await user.type(locationInput, 'KMC')
    await user.click(screen.getByRole('combobox', { name: /^semester/i }))
    await user.click(await screen.findByRole('option', { name: 'F26' }))
    await user.upload(
      screen.getByLabelText(/upload flyer/i),
      new File(['source'], 'fall-panel.png', { type: 'image/png' })
    )
    expect(screen.getByText(/fall-panel\.png selected/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(adminApiMocks.replaceEventFlyer).toHaveBeenCalledTimes(1))
    expect(adminApiMocks.createResource).toHaveBeenCalledWith(
      'events',
      expect.not.objectContaining({ flyerFile: expect.anything() })
    )
    expect(adminApiMocks.createResource).toHaveBeenCalledWith(
      'events',
      expect.objectContaining({ location: 'KMC' })
    )
    expect(adminApiMocks.createResource.mock.invocationCallOrder[0]).toBeLessThan(
      adminApiMocks.replaceEventFlyer.mock.invocationCallOrder[0]
    )
    expect(adminApiMocks.replaceEventFlyer).toHaveBeenCalledWith('event-new', {
      fullSize: {
        path: 'event-new.png',
        contentBase64: expect.any(String),
        contentType: 'image/png',
      },
      thumbnail: {
        path: 'thumbnails/event-new.jpg',
        contentBase64: expect.any(String),
        contentType: 'image/jpeg',
      },
    })
    expect(adminApiMocks.uploadStorageObject).not.toHaveBeenCalled()
  })

  it('retries a failed new-event flyer replacement without creating a duplicate event', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) => {
      if (resource === 'semesters') {
        return Promise.resolve([{ id: 'semester-1', semesterName: 'F26' }])
      }
      return Promise.resolve([])
    })
    const createdEvent = {
      id: 'event-retry',
      title: 'Retry Panel',
      flyerFile: null,
      updatedAt: '2026-07-22T16:00:00.000Z',
    }
    adminApiMocks.createResource.mockResolvedValue(createdEvent)
    adminApiMocks.replaceEventFlyer
      .mockRejectedValueOnce(new Error('Temporary media failure'))
      .mockResolvedValueOnce({
        event: {
          ...createdEvent,
          flyerFile: 'event-retry.png',
          updatedAt: '2026-07-22T16:01:00.000Z',
        },
        flyer: {
          fullSizeUrl: 'https://example.com/event-retry.png?v=2',
          thumbnailUrl: 'https://example.com/thumbnails/event-retry.jpg?v=2',
        },
      })
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^events$/i }))
    await user.click(await screen.findByRole('button', { name: /create event/i }))
    await user.type(screen.getByLabelText(/^title/i), 'Retry Panel')
    await user.type(screen.getByLabelText(/start date & time/i), '2026-09-02T17:00')
    await user.type(screen.getByLabelText(/^location/i), 'KMC')
    await user.click(screen.getByRole('combobox', { name: /^semester/i }))
    await user.click(await screen.findByRole('option', { name: 'F26' }))
    await user.upload(
      screen.getByLabelText(/upload flyer/i),
      new File(['source'], 'retry-panel.png', { type: 'image/png' })
    )
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/temporary media failure/i)).toBeInTheDocument()
    expect(adminApiMocks.createResource).toHaveBeenCalledTimes(1)
    expect(adminApiMocks.replaceEventFlyer).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(adminApiMocks.replaceEventFlyer).toHaveBeenCalledTimes(2))
    expect(adminApiMocks.createResource).toHaveBeenCalledTimes(1)
    expect(adminApiMocks.updateResource).toHaveBeenCalledWith(
      'events',
      'event-retry',
      expect.not.objectContaining({ flyerFile: expect.anything() })
    )
  })

  it('blocks an oversized combined media JSON body before calling the replacement endpoint', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) =>
      Promise.resolve(
        resource === 'board-members'
          ? [
              {
                id: 'board-large',
                fullName: 'Large Image',
                position: 'Treasurer',
                email: 'large@example.com',
                headshotFile: null,
                headshotUpdatedAt: '2026-07-22T15:00:00.000Z',
                orderIndex: 0,
              },
            ]
          : []
      )
    )
    mediaMocks.getJsonByteSize.mockReturnValue(Math.floor(9.5 * 1024 * 1024))
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^board$/i }))
    await user.click(await screen.findByRole('button', { name: /edit large image/i }))
    await user.upload(
      screen.getByLabelText(/upload headshot/i),
      new File(['source'], 'large.png', { type: 'image/png' })
    )
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/exceed the 9\.5 mb client upload limit/i)).toBeInTheDocument()
    expect(adminApiMocks.replaceBoardHeadshot).not.toHaveBeenCalled()
    expect(adminApiMocks.uploadStorageObject).not.toHaveBeenCalled()
  })

  it('replaces an existing board headshot only through its paired endpoint', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) =>
      Promise.resolve(
        resource === 'board-members'
          ? [
              {
                id: 'board-1',
                fullName: 'Ada Lovelace',
                position: 'President',
                email: 'ada@example.com',
                headshotFile: null,
                headshotUpdatedAt: '2026-07-22T15:00:00.000Z',
                orderIndex: 0,
              },
            ]
          : []
      )
    )
    adminApiMocks.updateResource.mockResolvedValue({})
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^board$/i }))
    await user.click(await screen.findByRole('button', { name: /edit ada lovelace/i }))
    await user.upload(
      screen.getByLabelText(/upload headshot/i),
      new File(['source'], 'ada.png', { type: 'image/png' })
    )
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(adminApiMocks.replaceBoardHeadshot).toHaveBeenCalledTimes(1))
    expect(adminApiMocks.replaceBoardHeadshot).toHaveBeenCalledWith(
      'board-1',
      expect.objectContaining({
        fullSize: expect.objectContaining({ path: 'board-1.png' }),
        thumbnail: expect.objectContaining({ path: 'thumbnails/board-1.jpg' }),
      })
    )
    expect(adminApiMocks.uploadStorageObject).not.toHaveBeenCalled()
  })

  it('browses storage buckets and virtual folders like a file manager', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listStorageBuckets.mockResolvedValue([
      { id: 'event-flyers', name: 'event-flyers', public: true },
    ])
    adminApiMocks.listStorageObjects.mockImplementation(
      (_bucketId: string, params: { prefix?: string }) =>
        Promise.resolve(
          params.prefix
            ? [
                {
                  name: 'event.jpg',
                  path: 'archive/event.jpg',
                  type: 'file',
                  metadata: { size: 2048, mimetype: 'image/jpeg' },
                  publicUrl: 'https://example.com/event.jpg',
                  updatedAt: '2026-07-12T12:00:00.000Z',
                },
              ]
            : [
                {
                  name: 'archive',
                  path: 'archive',
                  type: 'folder',
                  metadata: null,
                },
              ]
        )
    )
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^storage$/i }))
    expect(await screen.findByRole('heading', { name: /^storage$/i })).toBeInTheDocument()
    expect(screen.getByText(/choose a bucket/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /event-flyers/i }))
    expect(await screen.findByRole('button', { name: /^archive$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upload files/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create folder/i })).not.toBeInTheDocument()
    expect(screen.getByText(/replace them from the events or board editor/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^archive$/i }))
    expect(await screen.findByRole('button', { name: /^event\.jpg$/i })).toBeInTheDocument()
    expect(adminApiMocks.listStorageObjects).toHaveBeenLastCalledWith('event-flyers', {
      prefix: 'archive',
      search: '',
    })
  })

  it('creates a persistent virtual storage folder through the backend', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listStorageBuckets.mockResolvedValue([
      { id: 'documents', name: 'documents', public: true },
    ])
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^storage$/i }))
    await user.click(await screen.findByRole('button', { name: /documents/i }))
    await user.click(screen.getByRole('button', { name: /create folder/i }))
    const dialog = await screen.findByRole('dialog', { name: /create folder/i })
    await user.type(within(dialog).getByRole('textbox', { name: /folder name/i }), 'archive')
    await user.click(within(dialog).getByRole('button', { name: /create folder/i }))

    await waitFor(() => {
      expect(adminApiMocks.uploadStorageObject).toHaveBeenCalledWith('documents', {
        path: 'archive/.keep',
        contentBase64: '',
        contentType: 'application/octet-stream',
        upsert: false,
      })
    })
  })
})
